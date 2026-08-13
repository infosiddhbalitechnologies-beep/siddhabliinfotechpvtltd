from __future__ import annotations

import uuid
from functools import lru_cache
from typing import Any, Optional

from supabase import Client, create_client

from .config import get_settings


@lru_cache
def get_client() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def new_token() -> str:
    return uuid.uuid4().hex


# ---------------------------------------------------------------------------
# chat_sessions
# ---------------------------------------------------------------------------

def create_session(guest_token: Optional[str], title: str) -> dict[str, Any]:
    client = get_client()
    resp = (
        client.table("chat_sessions")
        .insert(
            {
                "guest_token": guest_token,
                "title": title,
                "stage": "ask_name",
            }
        )
        .execute()
    )
    return resp.data[0]


def get_session(session_id: str) -> Optional[dict[str, Any]]:
    client = get_client()
    resp = (
        client.table("chat_sessions")
        .select(
            "id,user_id,guest_token,stage,visitor_name,visitor_contact,"
            "ticket_draft,created_at,updated_at"
        )
        .eq("id", session_id)
        .maybe_single()
        .execute()
    )
    return resp.data if resp else None


def update_session(session_id: str, fields: dict[str, Any]) -> None:
    client = get_client()
    client.table("chat_sessions").update(fields).eq("id", session_id).execute()


# ---------------------------------------------------------------------------
# chat_messages
# ---------------------------------------------------------------------------

def insert_message(session_id: str, role: str, content: str) -> None:
    client = get_client()
    client.table("chat_messages").insert(
        {"session_id": session_id, "role": role, "content": content}
    ).execute()


def list_messages(session_id: str) -> list[dict[str, Any]]:
    client = get_client()
    resp = (
        client.table("chat_messages")
        .select("id,role,content,created_at")
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .execute()
    )
    return resp.data or []


# ---------------------------------------------------------------------------
# tickets (support-ticket sub-flow — always "it_support" type, always tied
# to an authenticated user)
# ---------------------------------------------------------------------------

def get_profile(user_id: str) -> Optional[dict[str, Any]]:
    client = get_client()
    resp = (
        client.table("profiles")
        .select("full_name,email")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    return resp.data if resp else None


def insert_it_support_ticket(
    client: Client,
    *,
    user_id: str,
    category: str,
    description: str,
    priority: str,
    contact_name: str,
    contact_email: str,
) -> dict[str, Any]:
    """
    Inserts an it_support ticket. `client` should be an RLS-scoped client
    bound to the caller's own token when available (see app.auth) so the
    "IT support tickets require authenticated owner" database policy is
    enforced by Postgres itself, not just this function. `user_id` always
    comes from a verified token — never from request input — and is what
    gets written to `submitted_by`.
    """
    resp = (
        client.table("tickets")
        .insert(
            {
                "type": "it_support",
                "subject": category[:200],
                "message": description,
                "contact_name": contact_name,
                "contact_email": contact_email,
                "category": category,
                "priority": priority,
                "submitted_by": user_id,
            }
        )
        .select("id, ticket_number, status, created_at")
        .execute()
    )
    return resp.data[0]
