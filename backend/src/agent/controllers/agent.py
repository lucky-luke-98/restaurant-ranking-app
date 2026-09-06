from asyncio import Semaphore, to_thread

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import ValidationError

from src.agent.gateways import LlmBudgetError, LlmError, SttGateway
from src.config import settings
from src.agent.models import (
    AgentChatRequest,
    AgentChatResponse,
    AgentConfirmRequest,
    AgentConfirmResponse,
)
from src.agent.services.agent_srv import AgentService
from src.agent.services.confirm_srv import ConfirmService
from src.db.errors import AlreadyExistsError
from src.dependencies import get_agent_service, get_confirm_service, get_stt_gateway
from src.utils.auth import get_current_user
from src.utils.rate_limit import limiter

router = APIRouter()

# Two concurrent turns share one 8,000-TPM window and would 429 (§3). Render free is a
# single worker, so an in-process semaphore is both sufficient and correct.
_turn_semaphore = Semaphore(1)


@router.post("/chat")
# The existing key function reads the JWT user_id, so the daily budget enforces itself
# per user (falling back to IP for unauthenticated noise).
@limiter.limit("10/day")
async def agent_chat(
    request: Request,
    body: AgentChatRequest,
    current_user: dict = Depends(get_current_user),
    agent: AgentService = Depends(get_agent_service),
) -> AgentChatResponse:
    """Endpoint for one agent turn (questions, and drafting reviews for confirmation)."""
    try:
        async with _turn_semaphore:
            result = await to_thread(
                agent.chat,
                user_id=current_user["user_id"],
                message=body.message,
                history=body.history,
                language=body.language,
                restaurant_id=body.restaurant_id,
            )
        return AgentChatResponse(**result)
    except LlmBudgetError as exp:
        # Permanent: retrying cannot make the request fit the per-minute ceiling.
        raise HTTPException(status_code=413, detail=str(exp))
    except LlmError as exp:
        raise HTTPException(status_code=502, detail=str(exp))
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.post("/transcribe")
@limiter.limit("60/day")
async def agent_transcribe(
    request: Request,
    file: UploadFile = File(...),
    language: str = Form("de"),
    _: dict = Depends(get_current_user),
    stt: SttGateway = Depends(get_stt_gateway),
) -> dict:
    """Endpoint that turns one dictated audio clip into text for the chat composer."""
    audio = await file.read()
    if len(audio) > settings.stt_max_audio_bytes:
        raise HTTPException(status_code=413, detail="Audio clip is too large.")
    if not audio:
        raise HTTPException(status_code=422, detail="Empty audio clip.")
    if language not in ("de", "en"):
        language = "de"
    try:
        text = await to_thread(
            stt.transcribe,
            audio,
            file.filename or "audio.webm",
            file.content_type or "audio/webm",
            language,
        )
        return {"text": text}
    except LlmError as exp:
        raise HTTPException(status_code=502, detail=str(exp))
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.post("/confirm")
async def agent_confirm(
    request: Request,
    body: AgentConfirmRequest,
    current_user: dict = Depends(get_current_user),
    confirm: ConfirmService = Depends(get_confirm_service),
) -> AgentConfirmResponse:
    """Endpoint that commits a user-confirmed proposal. The only agent write path."""
    try:
        result = await to_thread(
            confirm.confirm,
            kind=body.kind,
            proposal_id=body.proposal_id,
            payload=body.payload,
            user_id=current_user["user_id"],
        )
        return AgentConfirmResponse(success=True, review_id=result.get("review_id"))
    except AlreadyExistsError:
        raise HTTPException(status_code=409, detail="This draft was already saved.")
    except ValidationError as exp:
        raise HTTPException(status_code=422, detail=str(exp))
    except ValueError as exp:
        raise HTTPException(status_code=400, detail=str(exp))
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))
