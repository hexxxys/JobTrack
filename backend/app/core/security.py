from jose import jwt, JWTError
from fastapi import HTTPException, status
from .config import settings


def decode_nextauth_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.NEXTAUTH_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証トークンが無効または期限切れです",
            headers={"WWW-Authenticate": "Bearer"},
        )
