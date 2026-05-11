from pydantic import BaseModel


class UserResponse(BaseModel):
    id: str
    email: str
    name: str | None = None

    model_config = {"from_attributes": True}
