from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    image: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
