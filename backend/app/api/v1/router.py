from fastapi import APIRouter, Depends
from ..deps import get_current_user
from ...models.user import User
from ...schemas.user import UserResponse

api_router = APIRouter()


@api_router.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """ログイン中のユーザー情報を返す（動作確認用）"""
    return current_user
