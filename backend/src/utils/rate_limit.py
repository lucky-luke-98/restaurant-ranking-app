from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from src.utils.auth import decode_access_token


def _get_user_id_or_ip(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            token = auth[len("Bearer "):]
            payload = decode_access_token(token)
            return payload.get("user_id", get_remote_address(request))
        except Exception:
            pass
    return get_remote_address(request)


limiter = Limiter(key_func=_get_user_id_or_ip)
