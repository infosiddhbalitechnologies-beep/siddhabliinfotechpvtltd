from __future__ import annotations

import json
import re
from typing import Optional

import httpx

from .config import get_settings

GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

NAME_VALIDATION_PROMPT = """You validate the "name" slot for a chatbot's onboarding form.
Given the visitor's raw reply, decide whether it contains a plausible human first name (any language/script is fine).
It is NOT a valid name if it is empty, a greeting only, a question, gibberish, or clearly not a name.
Respond with ONLY a compact JSON object, no markdown, no code fences, in this exact shape:
{"valid": true|false, "name": "<the extracted name in Title Case, or empty string if invalid>"}"""


class GeminiError(RuntimeError):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


async def call_gemini(
    system_instruction: str,
    contents: list[dict],
) -> str:
    settings = get_settings()
    url = GEMINI_ENDPOINT.format(model=settings.gemini_model)

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            url,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": settings.gemini_api_key,
            },
            json={
                "systemInstruction": {"parts": [{"text": system_instruction}]},
                "contents": contents,
            },
        )

    if resp.status_code != 200:
        body = resp.text
        print(f"Gemini API error {resp.status_code}: {body}")
        if resp.status_code == 429:
            raise GeminiError("Too many requests — please slow down.", 429)
        if resp.status_code in (400, 401, 403):
            raise GeminiError("AI service is not configured correctly.", 502)
        raise GeminiError("AI service is temporarily unavailable.", 502)

    data = resp.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError):
        return ""


async def validate_name(raw_reply: str) -> tuple[bool, str]:
    """Returns (valid, extracted_name)."""
    try:
        text = await call_gemini(
            NAME_VALIDATION_PROMPT,
            [{"role": "user", "parts": [{"text": raw_reply}]}],
        )
        cleaned = re.sub(r"```json|```", "", text).strip()
        parsed = json.loads(cleaned)
        name = str(parsed.get("name") or "").strip()
        valid = bool(parsed.get("valid")) and len(name) > 0
        return valid, name
    except Exception as exc:  # noqa: BLE001 - deliberate broad fallback
        print(f"[chat] name validation failed, falling back: {exc}")
        trimmed = raw_reply.strip()
        allowed_extra = set(" .'-")
        looks_like_name = (
            2 <= len(trimmed) <= 60
            and "?" not in trimmed
            and all(ch.isalpha() or ch in allowed_extra for ch in trimmed)
            and any(ch.isalpha() for ch in trimmed)
        )
        return looks_like_name, trimmed


def validate_contact_number(raw_reply: str) -> tuple[bool, str]:
    trimmed = raw_reply.strip()
    digits_only = re.sub(r"[^\d+]", "", trimmed)
    digit_count = len(digits_only.replace("+", ""))
    return 7 <= digit_count <= 15, trimmed
