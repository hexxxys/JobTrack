from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.status import Status
from app.models.user import User
from app.schemas.status import StatusCreate, StatusOut, StatusUpdate

router = APIRouter(prefix="/statuses", tags=["statuses"])


@router.get("", response_model=list[StatusOut])
def list_statuses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Status).filter(Status.user_id == current_user.id).order_by(Status.position).all()


@router.post("", response_model=StatusOut, status_code=status.HTTP_201_CREATED)
def create_status(
    body: StatusCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_status = Status(**body.model_dump(), user_id=current_user.id)
    db.add(new_status)
    db.commit()
    db.refresh(new_status)
    return new_status


@router.patch("/{status_id}", response_model=StatusOut)
def update_status(
    status_id: str,
    body: StatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.query(Status).filter(Status.id == status_id, Status.user_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ステータスが見つかりません")
    if s.is_default and body.name is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="デフォルトステータスの名称は変更できません")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{status_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_status(
    status_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.query(Status).filter(Status.id == status_id, Status.user_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ステータスが見つかりません")
    if s.is_default:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="デフォルトステータスは削除できません")

    db.delete(s)
    db.commit()
