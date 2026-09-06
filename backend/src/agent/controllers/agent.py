from asyncio import to_thread

from fastapi import APIRouter, Depends, HTTPException, Request

from src.agent.gateways import LlmError
from src.agent.models import AgentChatRequest, AgentChatResponse
from src.agent.services.agent_srv import AgentService
from src.dependencies import get_agent_service
from src.utils.auth import get_current_user
from src.utils.rate_limit import limiter

router = APIRouter()


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
    """Endpoint for one read-only agent turn ("ask about your reviews")."""
    try:
        result = await to_thread(
            agent.chat,
            user_id=current_user["user_id"],
            message=body.message,
            history=body.history,
            language=body.language,
            restaurant_id=body.restaurant_id,
        )
        return AgentChatResponse(**result)
    except LlmError as exp:
        raise HTTPException(status_code=502, detail=str(exp))
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))
