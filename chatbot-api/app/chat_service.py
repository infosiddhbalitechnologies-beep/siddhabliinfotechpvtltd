from __future__ import annotations

import re
from typing import Any, Optional

from fastapi import HTTPException

from . import db
from .auth import rls_scoped_client
from .gemini import GeminiError, call_gemini, validate_contact_number, validate_name

SYSTEM_PROMPT = """You are SIDDH, the friendly AI assistant for SIDDHBALI TECHNOLOGIES — a technology services company based in Gorakhpur, Uttar Pradesh, India.

SIDDHBALI TECHNOLOGIES offers exactly eight services: IT Support & Service Desk, Software Development, Web & Application Development, AI & Data Solutions, Automation Solutions, Graphic Design, Research & Technical Writing, and Ticket Raising & Issue Management.

REPLY STYLE:
- Keep replies SHORT — 2-4 sentences for most answers, not paragraphs.
- When asked what you offer/do, name the services in one flowing sentence (not a bulleted list) and end by inviting them to say which one is closest to their need, e.g. "Tell me which one fits what you're working on and I'll point you in the right direction."
- Use markdown sparingly (bold, bullets) — only when it genuinely helps scanning, never by default.
- Maintain conversation context across turns.
- Do not claim services, industries, or capabilities beyond the eight services listed above.
- If you know the visitor's name (given below), address them by it naturally once in a while — not in every reply.

Help visitors with:
- Company information & mission
- The eight services listed above (point them to the Services page for details)
- Careers & open roles (point them to the Careers page or /apply to submit an application)
- Contact details (point them to the Contact page)
- Support tickets: explain that raising a support ticket is done right here in chat by saying something like "I want to raise a ticket", but that ticket CREATION requires the visitor to be logged in (existing tickets can always be looked up at /track without logging in).

If you cannot confidently answer (pricing quotes, partnerships, NDAs, legal, specific case studies, anything you're unsure about), DO NOT guess. Instead reply briefly and then suggest the user choose one of these next steps:
1. Contact Us — visit /contact
2. Business Enquiry — visit /contact (select Business Enquiry)
3. Raise a Ticket — say "raise a ticket" here in chat (login required), or visit /track to check an existing one

Never invent prices, names of employees, partner companies, or contractual details."""

ASK_NAME_QUESTION = (
    "Hi! I'm SIDDH, the assistant for SIDDHBALI TECHNOLOGIES. "
    "Before we get started, could you tell me your name?"
)
ASK_NAME_REPROMPT = "Sorry, I didn't quite catch a name there — could you tell me your name?"


def ask_contact_question(name: str) -> str:
    return f"Nice to meet you, {name}! What's the best contact number to reach you on?"


ASK_CONTACT_REPROMPT = (
    "That doesn't look like a valid contact number — could you share a "
    "phone number I can reach you on?"
)


def welcome_to_faq(name: str) -> str:
    return (
        f"Thanks, {name} — you're all set. Ask me anything about our "
        "services, industries we serve, or how to raise a support ticket."
    )


# ---------------------------------------------------------------------------
# In-chat support-ticket sub-flow (category -> description -> priority ->
# confirm). Ticket CREATION is gated behind authentication; everything else
# stays open to guests.
# ---------------------------------------------------------------------------

LOGIN_REQUIRED_MESSAGE = (
    "Sure, I can help you raise a support ticket. However, ticket creation "
    "is available only for logged-in users. Please log in to your account "
    "first."
)

TICKET_SERVICES = [
    "IT Support & Service Desk",
    "Software Development",
    "Web & Application Development",
    "AI & Data Solutions",
    "Automation Solutions",
    "Graphic Design",
    "Research & Technical Writing",
    "Ticket Raising & Issue Management",
]

ASK_TICKET_CATEGORY = (
    "Sure! Let's create a support ticket. Which of these is it about — "
    f"{', '.join(TICKET_SERVICES)} — or something else? "
    "You can just describe it in your own words."
)
ASK_TICKET_CATEGORY_REPROMPT = "Could you tell me which service or area this ticket is about?"
ASK_TICKET_DESCRIPTION = "Got it. Now, please describe the issue or request in a bit more detail."
ASK_TICKET_DESCRIPTION_REPROMPT = (
    "Could you give me a few more details about the issue so I can log it properly?"
)
ASK_TICKET_PRIORITY = "What priority would you give this — low, normal, high, or urgent?"
ASK_TICKET_PRIORITY_REPROMPT = (
    "Sorry, I didn't catch that — is this low, normal, high, or urgent priority?"
)


def ask_ticket_confirm(category: str, description: str, priority: str) -> str:
    return (
        f"Here's what I have:\n- Category: {category}\n- Description: {description}\n"
        f"- Priority: {priority}\n\nShall I go ahead and create this ticket? (yes/no)"
    )


ASK_TICKET_CONFIRM_REPROMPT = 'Please reply "yes" to confirm or "no" to cancel.'
TICKET_CANCELLED = "No problem, I've cancelled that. Let me know if you'd like to raise a ticket later."


def ticket_created_message(ticket_number: str) -> str:
    return (
        f"Your ticket has been created successfully. ✅\n\nTicket ID: #{ticket_number}\n\n"
        "You can use this ID to track your support request."
    )


AUTH_REQUIRED_FOR_TICKET = "Authentication required to create a ticket."

_CREATE_VERBS = re.compile(r"\b(raise|create|open|file|log|submit|start|need|want|make)\b")
_HOWTO_WORDS = re.compile(r"\b(how|what|steps|process|can i|could i)\b")


def detect_ticket_intent(message: str) -> Optional[str]:
    """
    Lightweight rule-based intent match — a small NLU rule layer in front of
    the free-form LLM stage, the same heuristic the TS backend uses, so
    behavior is consistent across both surfaces.
    """
    lower = message.lower()
    if "ticket" not in lower:
        return None
    if _CREATE_VERBS.search(lower) and not _HOWTO_WORDS.search(lower):
        return "create"
    return "howto"


def parse_priority(message: str) -> Optional[str]:
    lower = message.lower()
    if re.search(r"\b(urgent|critical|asap|emergency)\b", lower):
        return "urgent"
    if re.search(r"\bhigh\b", lower):
        return "high"
    if re.search(r"\b(low|minor)\b", lower):
        return "low"
    if re.search(r"\b(normal|medium|standard|regular)\b", lower):
        return "normal"
    return None


def parse_yes_no(message: str) -> Optional[bool]:
    lower = message.strip().lower()
    if re.match(r"^(y|yes|yep|yeah|confirm|correct|go ahead|sure)\b", lower):
        return True
    if re.match(r"^(n|no|nope|cancel|stop|never mind)\b", lower):
        return False
    return None


def _create_support_ticket(
    authorization: Optional[str],
    user_id: str,
    draft: dict[str, Any],
) -> dict[str, Any]:
    """
    Creates the ticket. Prefers an RLS-scoped client bound to the caller's
    own token (so the database's own "authenticated owner" policy is what
    actually enforces this, not just this function) and falls back to the
    service-role client, still writing the app-verified `user_id` — never a
    client-supplied one — as `submitted_by`.
    """
    profile = db.get_profile(user_id) or {}
    client = rls_scoped_client(authorization) or db.get_client()
    return db.insert_it_support_ticket(
        client,
        user_id=user_id,
        category=draft.get("category", ""),
        description=draft.get("description", ""),
        priority=draft.get("priority", "normal"),
        contact_name=profile.get("full_name") or profile.get("email") or "User",
        contact_email=profile.get("email") or "",
    )


async def start_session(guest_token: Optional[str]) -> dict[str, Any]:
    token = guest_token or db.new_token()
    session = db.create_session(guest_token=token, title="New conversation")
    db.insert_message(session["id"], "assistant", ASK_NAME_QUESTION)
    return {
        "session_id": session["id"],
        "guest_token": token,
        "reply": ASK_NAME_QUESTION,
        "stage": "ask_name",
    }


def _resolve_session(session_id: str, guest_token: Optional[str]) -> dict[str, Any]:
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    # Anonymous sessions are scoped to whoever holds the guest_token.
    if session.get("user_id") is None:
        if not guest_token or session.get("guest_token") != guest_token:
            raise HTTPException(status_code=403, detail="guest_token does not match this session")
    return session


async def send_message(
    session_id: str,
    guest_token: Optional[str],
    message: str,
    user_id: Optional[str],
    authorization: Optional[str],
) -> dict[str, Any]:
    """
    `user_id` must already be a verified id (see app.auth.resolve_user_id),
    resolved by the caller from the request's Authorization header — this
    function never trusts an id supplied any other way.
    """
    session = _resolve_session(session_id, guest_token)
    stage = session.get("stage") or "ask_name"
    visitor_name = session.get("visitor_name")
    ticket_draft: dict[str, Any] = session.get("ticket_draft") or {}

    db.insert_message(session_id, "user", message)

    try:
        if stage == "ask_name":
            valid, name = await validate_name(message)
            reply = ask_contact_question(name) if valid else ASK_NAME_REPROMPT
            next_stage = "ask_contact" if valid else "ask_name"
            update: dict[str, Any] = {"stage": next_stage}
            if valid:
                update["visitor_name"] = name
            db.update_session(session_id, update)
            db.insert_message(session_id, "assistant", reply)
            return {
                "session_id": session_id,
                "reply": reply,
                "stage": next_stage,
                "visitor_name": name if valid else visitor_name,
            }

        if stage == "ask_contact":
            valid, contact = validate_contact_number(message)
            name = visitor_name or "there"
            reply = welcome_to_faq(name) if valid else ASK_CONTACT_REPROMPT
            next_stage = "faq" if valid else "ask_contact"
            update = {"stage": next_stage}
            if valid:
                update["visitor_contact"] = contact
            db.update_session(session_id, update)
            db.insert_message(session_id, "assistant", reply)
            return {
                "session_id": session_id,
                "reply": reply,
                "stage": next_stage,
                "visitor_name": visitor_name,
            }

        # ---- Support-ticket sub-flow (login-gated) --------------------------
        if stage == "ticket_category":
            category = message.strip()
            valid = len(category) >= 2
            reply = ASK_TICKET_DESCRIPTION if valid else ASK_TICKET_CATEGORY_REPROMPT
            next_stage = "ticket_description" if valid else "ticket_category"
            next_draft = {**ticket_draft, "category": category} if valid else ticket_draft
            db.update_session(session_id, {"stage": next_stage, "ticket_draft": next_draft})
            db.insert_message(session_id, "assistant", reply)
            return {"session_id": session_id, "reply": reply, "stage": next_stage, "visitor_name": visitor_name}

        if stage == "ticket_description":
            description = message.strip()
            valid = len(description) >= 5
            reply = ASK_TICKET_PRIORITY if valid else ASK_TICKET_DESCRIPTION_REPROMPT
            next_stage = "ticket_priority" if valid else "ticket_description"
            next_draft = {**ticket_draft, "description": description} if valid else ticket_draft
            db.update_session(session_id, {"stage": next_stage, "ticket_draft": next_draft})
            db.insert_message(session_id, "assistant", reply)
            return {"session_id": session_id, "reply": reply, "stage": next_stage, "visitor_name": visitor_name}

        if stage == "ticket_priority":
            priority = parse_priority(message)
            next_stage = "ticket_confirm" if priority else "ticket_priority"
            next_draft = {**ticket_draft, "priority": priority} if priority else ticket_draft
            reply = (
                ask_ticket_confirm(next_draft.get("category", ""), next_draft.get("description", ""), priority)
                if priority
                else ASK_TICKET_PRIORITY_REPROMPT
            )
            db.update_session(session_id, {"stage": next_stage, "ticket_draft": next_draft})
            db.insert_message(session_id, "assistant", reply)
            return {"session_id": session_id, "reply": reply, "stage": next_stage, "visitor_name": visitor_name}

        if stage == "ticket_confirm":
            answer = parse_yes_no(message)
            if answer is None:
                db.insert_message(session_id, "assistant", ASK_TICKET_CONFIRM_REPROMPT)
                return {
                    "session_id": session_id,
                    "reply": ASK_TICKET_CONFIRM_REPROMPT,
                    "stage": stage,
                    "visitor_name": visitor_name,
                }
            if not answer:
                db.update_session(session_id, {"stage": "faq", "ticket_draft": {}})
                db.insert_message(session_id, "assistant", TICKET_CANCELLED)
                return {
                    "session_id": session_id,
                    "reply": TICKET_CANCELLED,
                    "stage": "faq",
                    "visitor_name": visitor_name,
                }

            # Re-verify the caller is still authenticated right before
            # writing — never trust that an earlier turn's check still holds.
            if not user_id:
                db.update_session(session_id, {"stage": "faq", "ticket_draft": {}})
                db.insert_message(session_id, "assistant", AUTH_REQUIRED_FOR_TICKET)
                return {
                    "session_id": session_id,
                    "reply": AUTH_REQUIRED_FOR_TICKET,
                    "stage": "faq",
                    "visitor_name": visitor_name,
                }

            ticket = _create_support_ticket(authorization, user_id, ticket_draft)
            reply = ticket_created_message(ticket["ticket_number"])
            db.update_session(session_id, {"stage": "faq", "ticket_draft": {}})
            db.insert_message(session_id, "assistant", reply)
            return {"session_id": session_id, "reply": reply, "stage": "faq", "visitor_name": visitor_name}

        # ---- Free-form FAQ (services / industries / tickets / etc.) --------
        ticket_intent = detect_ticket_intent(message)
        if ticket_intent:
            if not user_id:
                db.insert_message(session_id, "assistant", LOGIN_REQUIRED_MESSAGE)
                return {
                    "session_id": session_id,
                    "reply": LOGIN_REQUIRED_MESSAGE,
                    "stage": "faq",
                    "visitor_name": visitor_name,
                    "action": "login_required",
                }
            if ticket_intent == "create":
                db.update_session(session_id, {"stage": "ticket_category", "ticket_draft": {}})
                db.insert_message(session_id, "assistant", ASK_TICKET_CATEGORY)
                return {
                    "session_id": session_id,
                    "reply": ASK_TICKET_CATEGORY,
                    "stage": "ticket_category",
                    "visitor_name": visitor_name,
                }
            howto_reply = (
                'You can raise a support ticket any time — just tell me '
                '"I want to raise a ticket" and I\'ll walk you through the '
                "category, a description, and priority."
            )
            db.insert_message(session_id, "assistant", howto_reply)
            return {"session_id": session_id, "reply": howto_reply, "stage": "faq", "visitor_name": visitor_name}

        history = db.list_messages(session_id)
        contents = [
            {
                "role": "model" if m["role"] == "assistant" else "user",
                "parts": [{"text": m["content"]}],
            }
            for m in history
        ]
        prompt = SYSTEM_PROMPT
        if visitor_name:
            auth_note = "logged in" if user_id else "browsing as a guest (not logged in)"
            prompt += f"\n\nThe visitor's name is {visitor_name}. They are currently {auth_note}."

        reply = await call_gemini(prompt, contents) or "Sorry, I couldn't generate a response."
        db.insert_message(session_id, "assistant", reply)
        return {
            "session_id": session_id,
            "reply": reply,
            "stage": "faq",
            "visitor_name": visitor_name,
        }
    except GeminiError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


def get_session_with_messages(session_id: str, guest_token: Optional[str]) -> dict[str, Any]:
    session = db.get_session(session_id)
    if not session:
        return {"session": None, "messages": []}
    if session.get("user_id") is None:
        if not guest_token or session.get("guest_token") != guest_token:
            return {"session": None, "messages": []}
    messages = db.list_messages(session_id)
    return {"session": session, "messages": messages}


def create_standalone_ticket(
    authorization: Optional[str],
    user_id: Optional[str],
    category: str,
    description: str,
    priority: str,
) -> dict[str, Any]:
    """
    Backs the standalone POST /api/tickets endpoint. `user_id` must already
    be verified by the caller (see main.py) — if it's None, the caller
    should reject the request before ever reaching here.
    """
    if not user_id:
        raise HTTPException(status_code=401, detail=AUTH_REQUIRED_FOR_TICKET)
    return _create_support_ticket(
        authorization, user_id, {"category": category, "description": description, "priority": priority}
    )
