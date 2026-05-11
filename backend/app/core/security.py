from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.core.config import settings

ALGORITHM = "HS256"


def decode_nextauth_token(token: str) -> dict:
    """
    Auth.js (NextAuth.js v4) が HS256 で署名した JWT を検証して payload を返す。
    署名・有効期限・issuer が不正な場合は 401 を返す。
    """
    try:
        payload = jwt.decode(
            token,
            settings.NEXTAUTH_SECRET,
            algorithms=[ALGORITHM],
            options={"verify_aud": False},
        )
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証トークンが無効です",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
