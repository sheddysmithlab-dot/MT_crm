from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, DateTime, Numeric, Integer, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


def _utcnow() -> datetime:
    return datetime.utcnow()


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    synced_from: Mapped[Optional[str]] = mapped_column(String(50), default="server", nullable=True)


class User(Base, TimestampMixin):
    __tablename__ = "crm_users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    username: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(64), default="Employee", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    avatar: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    preferences: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class Profile(Base, TimestampMixin):
    __tablename__ = "crm_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), index=True, nullable=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    username: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(64), default="Employee", nullable=False)
    roleId: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    branch_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    permissions: Mapped[Optional[dict | list]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    avatar: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class Customer(Base, TimestampMixin):
    __tablename__ = "crm_customers"
    __table_args__ = (Index("ix_customers_type_status", "type", "status"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    type: Mapped[str] = mapped_column(String(64), default="customer", nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    pincode: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    gstin: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    pan: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    credit_limit: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    credit_days: Mapped[int] = mapped_column(Integer, default=0)
    opening_balance: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    current_balance: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    vehicles: Mapped[Optional[dict | list]] = mapped_column(JSON, nullable=True)
    documents: Mapped[Optional[dict | list]] = mapped_column(JSON, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    convertedAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    convertedFrom: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)


# Tables that must not accept offline client writes (Option B rule)
ONLINE_ONLY_TABLES = frozenset(
    {
        "payments",
        "cash_receipts",
        "vouchers",
        "stock_movements",
        "stock_transactions",
        "invoices",
        "journal_entries",
        "journal_lines",
    }
)
