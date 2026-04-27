from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.company import Company
from app.models.status import Status
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyOut, CompanyUpdate

router = APIRouter(prefix="/companies", tags=["companies"])


def _get_company_or_404(company_id: str, user_id: str, db: Session) -> Company:
    company = db.query(Company).filter(Company.id == company_id, Company.user_id == user_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="企業が見つかりません")
    return company


@router.get("", response_model=list[CompanyOut])
def list_companies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Company)
        .filter(Company.user_id == current_user.id)
        .order_by(Company.updated_at.desc())
        .all()
    )


@router.post("", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
def create_company(
    body: CompanyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    status_exists = (
        db.query(Status).filter(Status.id == body.status_id, Status.user_id == current_user.id).first()
    )
    if not status_exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ステータスが見つかりません")

    data = body.model_dump()
    data["url"] = str(data["url"]) if data.get("url") else None
    company = Company(**data, user_id=current_user.id)
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("/{company_id}", response_model=CompanyOut)
def get_company(
    company_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_company_or_404(company_id, current_user.id, db)


@router.patch("/{company_id}", response_model=CompanyOut)
def update_company(
    company_id: str,
    body: CompanyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _get_company_or_404(company_id, current_user.id, db)

    data = body.model_dump(exclude_none=True)
    if "url" in data:
        data["url"] = str(data["url"]) if data["url"] else None
    if "status_id" in data:
        status_exists = (
            db.query(Status).filter(Status.id == data["status_id"], Status.user_id == current_user.id).first()
        )
        if not status_exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ステータスが見つかりません")

    for field, value in data.items():
        setattr(company, field, value)
    db.commit()
    db.refresh(company)
    return company


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _get_company_or_404(company_id, current_user.id, db)
    db.delete(company)
    db.commit()
