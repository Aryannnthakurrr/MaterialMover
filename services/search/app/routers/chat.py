"""FastAPI router for the Gemini-powered conversational product advisor."""

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    ChatStartResponse,
    ChatMessageRequest,
    ChatMessageResponse,
    ChatHistoryResponse,
)
from app.services.gemini_chat import GeminiChatService


router = APIRouter(prefix="/chat", tags=["Chat Advisor"])

# The service instance is injected from main.py at startup
chat_service: GeminiChatService = None  # type: ignore


def set_chat_service(service: GeminiChatService) -> None:
    """Called from main.py lifespan to inject the initialised service."""
    global chat_service
    chat_service = service


# ── Endpoints ───────────────────────────────────────────────────────────────


@router.post(
    "/start",
    response_model=ChatStartResponse,
    summary="Start a new advisor conversation",
)
async def start_chat():
    """
    Create a new conversation session with the AI construction-materials advisor.

    Returns a `session_id` and an initial greeting message.  Use the
    `session_id` in subsequent `/chat/message` calls.
    """
    if not chat_service:
        raise HTTPException(
            status_code=503,
            detail="Chat service not initialised",
        )

    try:
        result = await chat_service.create_session()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start chat: {e}")


@router.post(
    "/message",
    response_model=ChatMessageResponse,
    summary="Send a message in an existing conversation",
)
async def send_message(request: ChatMessageRequest):
    """
    Send a user message to the advisor.

    The response `status` will be one of:

    - **active** – the model replied with a follow-up question; keep chatting.
    - **completed** – the model found enough context and returned product
      recommendations in the `products` array.
    """
    if not chat_service:
        raise HTTPException(
            status_code=503,
            detail="Chat service not initialised",
        )

    try:
        result = await chat_service.send_message(
            request.session_id, request.message
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Chat message failed: {e}"
        )


@router.get(
    "/history/{session_id}",
    response_model=ChatHistoryResponse,
    summary="Get conversation history",
)
async def get_history(session_id: str):
    """
    Retrieve the full message history and current status for a session.
    """
    if not chat_service:
        raise HTTPException(
            status_code=503,
            detail="Chat service not initialised",
        )

    try:
        result = await chat_service.get_session_history(session_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get history: {e}"
        )


@router.delete(
    "/{session_id}",
    summary="Delete a conversation session",
)
async def delete_session(session_id: str):
    """
    Delete a conversation session and free its resources.

    Use this when the frontend unmounts the chat component or when
    the user explicitly closes the advisor panel.
    """
    if not chat_service:
        raise HTTPException(
            status_code=503,
            detail="Chat service not initialised",
        )

    if session_id not in chat_service.sessions:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    del chat_service.sessions[session_id]
    return {"status": "deleted", "session_id": session_id}
