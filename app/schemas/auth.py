from pydantic import BaseModel


class LoginRequest(BaseModel):
    user_id: str
    password: str


class LoginResponse(BaseModel):
    user_id: str
    access_token: str
    token_type: str = "bearer"
