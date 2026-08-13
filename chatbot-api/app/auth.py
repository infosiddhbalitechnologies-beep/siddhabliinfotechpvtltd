from __future__ import annotations

from typing import Optional

from supabase import Client, create_client

from .config import get_settings


def _extract_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1].strip()
    return token or None


def resolve_user_id(authorization: Optional[str]) -> Optional[str]:
    """
    Verifies a Supabase access token against the Auth server and returns the
    real user id, or None if the header is missing/malformed/invalid.

    This NEVER trusts a client-supplied user id — the id only ever comes
    from Supabase itself validating the token, exactly like the website's
    `requireSupabaseAuth` middleware does.
    """
    token = _extract_token(authorization)
    if not token:
        return None

    settings = get_settings()
    if not settings.supabase_publishable_key:
        return None

    try:
        client = create_client(settings.supabase_url, settings.supabase_publishable_key)
        resp = client.auth.get_user(token)
        user = getattr(resp, "user", None)
        return user.id if user else None
    except Exception as exc:  # noqa: BLE001
        print(f"[auth] token verification failed: {exc}")
        return None


def rls_scoped_client(authorization: Optional[str]) -> Optional[Client]:
    """
    Best-effort RLS-scoped client bound to the caller's own access token, so
    ticket inserts are additionally checked by the database's own policies
    (not just this service's application logic) — matching the defense in
    depth the TS backend gets by using its per-request Supabase client
    instead of the service-role client. Falls back to None if unavailable;
    callers should fall back to a service-role insert with an
    app-verified `submitted_by` in that case.
    """
    token = _extract_token(authorization)
    settings = get_settings()
    if not token or not settings.supabase_publishable_key:
        return None
    try:
        client = create_client(settings.supabase_url, settings.supabase_publishable_key)
        client.postgrest.auth(token)
        return client
    except Exception as exc:  # noqa: BLE001
        print(f"[auth] could not build RLS-scoped client, falling back: {exc}")
        return None
