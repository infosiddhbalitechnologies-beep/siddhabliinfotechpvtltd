from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

Stage = Literal[
    "ask_name",
    "ask_contact",
    "faq",
    "ticket_category",
    "ticket_description",
    "ticket_priority",
    "ticket_confirm",
]


class StartChatRequest(BaseModel):
    guest_token: Optional[str] = Field(
        default=None,
        min_length=8,
        max_length=80,
        description="Client-generated token identifying an anonymous visitor. "
        "Omit to let the server generate one.",
    )


class StartChatResponse(BaseModel):
    session_id: str
    guest_token: Optional[str] = None
    reply: str
    stage: Stage


class SendMessageRequest(BaseModel):
    session_id: str = Field(..., description="Session id returned by /chat/start")
    guest_token: Optional[str] = Field(
        default=None,
        description="Required for anonymous sessions; must match the token the "
        "session was created with.",
    )
    message: str = Field(..., min_length=1, max_length=4000)


class SendMessageResponse(BaseModel):
    session_id: str
    reply: str
    stage: Stage
    visitor_name: Optional[str] = None
    action: Optional[Literal["login_required"]] = Field(
        default=None,
        description='Set to "login_required" when the visitor asked to raise '
        "a ticket but isn't authenticated — render a login button/link.",
    )


class ChatMessageOut(BaseModel):
    id: Optional[str] = None
    role: Literal["user", "assistant", "system"]
    content: str
    created_at: Optional[str] = None


class SessionOut(BaseModel):
    id: str
    stage: Stage
    visitor_name: Optional[str] = None
    visitor_contact: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class GetSessionResponse(BaseModel):
    session: Optional[SessionOut]
    messages: list[ChatMessageOut]


class ErrorResponse(BaseModel):
    error: str


class CreateTicketRequest(BaseModel):
    """
    For the standalone ticket-creation endpoint. Note there's no user_id
    field here on purpose — the owner is always taken from the verified
    Authorization header, never from the request body.
    """

    category: str = Field(..., min_length=2, max_length=200)
    description: str = Field(..., min_length=5, max_length=5000)
    priority: Literal["low", "normal", "high", "urgent"] = "normal"


class CreateTicketResponse(BaseModel):
    id: str
    ticket_number: str
    status: str
    created_at: str
