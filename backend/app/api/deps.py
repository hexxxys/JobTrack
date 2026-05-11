from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import decode_nextauth_token
from ..models.user import User

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_nextauth_token(credentials.credentials)

    user_id: str | None = payload.get("sub")
    email: str | None = payload.get("email")
    name: str | None = payload.get("name")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="トークンにユーザーIDがありません",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # 初回ログイン時にユーザーを自動作成
        user = User(id=user_id, email=email, name=name)
        db.add(user)
        db.commit()
        db.refresh(user)

    return user
