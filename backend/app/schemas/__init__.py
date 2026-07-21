from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field, ConfigDict, EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: Optional[str] = None
    role: str
    status: str


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    role: str
    permissions: Optional[Any] = None
    status: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    profile: Optional[ProfileOut] = None


class CustomerBase(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    type: str = "customer"
    company: Optional[str] = None
    status: str = "active"
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    credit_limit: float = 0
    credit_days: int = 0
    opening_balance: float = 0
    current_balance: float = 0
    vehicles: Optional[Any] = None
    documents: Optional[Any] = None
    notes: Optional[str] = None


class CustomerCreate(CustomerBase):
    id: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    type: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    credit_limit: Optional[float] = None
    credit_days: Optional[int] = None
    opening_balance: Optional[float] = None
    current_balance: Optional[float] = None
    vehicles: Optional[Any] = None
    documents: Optional[Any] = None
    notes: Optional[str] = None
    updated_at: Optional[datetime] = None


class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None


class SyncPushItem(BaseModel):
    queue_id: str
    table: str
    record_id: str
    operation: str  # upsert | delete
    data: Optional[dict[str, Any]] = None
    updated_at: Optional[datetime] = None
    client_id: Optional[str] = None


class SyncPushRequest(BaseModel):
    items: list[SyncPushItem]


class SyncPushResultItem(BaseModel):
    queue_id: str
    success: bool
    error: Optional[str] = None
    skipped: bool = False


class SyncPushResponse(BaseModel):
    success: bool
    results: list[SyncPushResultItem]


class SyncPullResponse(BaseModel):
    success: bool
    table: str
    records: list[dict[str, Any]]
    deleted_ids: list[str] = []
    pulled_at: datetime
