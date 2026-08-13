from __future__ import annotations

from typing import Optional

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import chat_service
from .auth import resolve_user_id
from .config import get_settings
from .schemas import (
    ChatMessageOut,
    CreateTicketRequest,
    CreateTicketResponse,
    GetSessionResponse,
    SendMessageRequest,
    SendMessageResponse,
    SessionOut,
    StartChatRequest,
    StartChatResponse,
)

app = FastAPI(
    title="SIDDH Chatbot API",
    description=(
        "REST endpoints for the SIDDHBALI TECHNOLOGIES chatbot: a slot-filling "
        "onboarding flow (name -> contact number) handed off to a Gemini-powered "
        "FAQ assistant, plus a login-gated in-chat support-ticket flow. Backed by "
        "the same Supabase tables the website widget uses, so sessions and "
        "tickets are interchangeable with it."
    ),
    version="1.1.0",
)


@app.on_event("startup")
def _validate_env() -> None:
    get_settings().validate()


settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok"}


@app.post(
    "/api/chat/start",
    response_model=StartChatResponse,
    tags=["chat"],
    summary="Start a new chat session",
    description=(
        "Creates a new chat session and returns SIDDH's opening question "
        "(asking for the visitor's name), so the widget can greet first "
        "without waiting for the visitor to type."
    ),
)
async def start_chat(payload: StartChatRequest) -> StartChatResponse:
    result = await chat_service.start_session(payload.guest_token)
    return StartChatResponse(**result)


@app.post(
    "/api/chat/message",
    response_model=SendMessageResponse,
    tags=["chat"],
    summary="Send a message in an existing session",
    description=(
        "Advances the conversation: the name slot, the contact-number slot, "
        "the FAQ stage, or — if the visitor asks to raise a support ticket — "
        "a login-gated ticket sub-flow (category, description, priority, "
        "confirm). Guests can chat, ask about services/industries, and learn "
        "how ticketing works freely; only ticket CREATION requires being "
        "signed in. Pass the visitor's Supabase access token in the "
        "`Authorization: Bearer <token>` header to be recognized as "
        "logged in — this is verified against Supabase on every call, never "
        "just trusted from a prior turn."
    ),
)
async def send_message(
    payload: SendMessageRequest,
    authorization: Optional[str] = Header(default=None),
) -> SendMessageResponse:
    user_id = resolve_user_id(authorization)
    result = await chat_service.send_message(
        payload.session_id,
        payload.guest_token,
        payload.message,
        user_id,
        authorization,
    )
    return SendMessageResponse(**result)


@app.get(
    "/api/chat/session/{session_id}",
    response_model=GetSessionResponse,
    tags=["chat"],
    summary="Fetch a session's history",
    description=(
        "Returns the session's current stage/slots and full message history. "
        "For anonymous sessions, guest_token must match the token the session "
        "was created with."
    ),
)
def get_session(session_id: str, guest_token: str | None = None) -> GetSessionResponse:
    result = chat_service.get_session_with_messages(session_id, guest_token)
    session = result["session"]
    return GetSessionResponse(
        session=SessionOut(**session) if session else None,
        messages=[ChatMessageOut(**m) for m in result["messages"]],
    )


@app.post(
    "/api/tickets",
    response_model=CreateTicketResponse,
    tags=["tickets"],
    summary="Create a support ticket (authenticated users only)",
    description=(
        "Standalone ticket-creation endpoint, independent of the chat flow. "
        "Requires a valid Supabase access token in the `Authorization: "
        "Bearer <token>` header — the request is REJECTED with 401 if it's "
        "missing or invalid, even if the caller is otherwise trusted. The "
        "ticket's owner always comes from the verified token, never from "
        "the request body, so it cannot be spoofed."
    ),
)
def create_ticket(
    payload: CreateTicketRequest,
    authorization: Optional[str] = Header(default=None),
) -> CreateTicketResponse:
    user_id = resolve_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required to create a ticket.")
    row = chat_service.create_standalone_ticket(
        authorization, user_id, payload.category, payload.description, payload.priority
    )
    return CreateTicketResponse(**row)
