"""Shared entity helpers + extra CRM models for Jobs / Vendors / Inventory / Accounts."""
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import String, Text, DateTime, Numeric, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.db.models import TimestampMixin


def _utcnow() -> datetime:
    return datetime.utcnow()


class Job(Base, TimestampMixin):
    __tablename__ = "crm_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    job_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    status: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    customerId: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    party_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vehicle_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    vehicleNo: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    vehicleModel: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    vehicleType: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    vehicleColor: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    kmReading: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    scheduledStart: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    scheduledEnd: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    actualStart: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    actualEnd: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    syncStatus: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    createdAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class Vendor(Base, TimestampMixin):
    __tablename__ = "crm_vendors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    company: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    pincode: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    gstin: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    pan: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    serviceType: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    vendorType: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    opening_balance: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    current_balance: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class Labour(Base, TimestampMixin):
    __tablename__ = "crm_labour"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    skill_type: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    designation: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    hourly_rate: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    daily_rate: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    vendor_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    vendorId: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    technicianId: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    employeeId: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    opening_balance: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    current_balance: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class Supplier(Base, TimestampMixin):
    __tablename__ = "crm_suppliers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    company: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    pincode: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    gstin: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    opening_balance: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    current_balance: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class InventoryCategory(Base, TimestampMixin):
    __tablename__ = "crm_inventory_categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parent_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class InventoryItem(Base, TimestampMixin):
    __tablename__ = "crm_inventory_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    material_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    category_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    unit: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    current_stock: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    stock_quantity: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    min_stock: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    cost_price: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    selling_price: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    location: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    hsn_code: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class StockMovement(Base, TimestampMixin):
    __tablename__ = "crm_stock_movements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    item_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    movement_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    quantity: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    movement_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    reference_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    reference_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class Purchase(Base, TimestampMixin):
    __tablename__ = "crm_purchases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    invoice_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    invoice_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    supplier_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    supplierId: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    supplier_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    tax_amount: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    total_amount: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    paid_amount: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    materials: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class Voucher(Base, TimestampMixin):
    __tablename__ = "crm_vouchers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    voucher_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    voucher_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    voucher_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    payee_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    payee_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    payee_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    particulars: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    payment_mode: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class Product(Base, TimestampMixin):
    __tablename__ = "crm_products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    category: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    price: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    stock: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    unit: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


__all__ = [
    "Job",
    "Vendor",
    "Labour",
    "Supplier",
    "InventoryCategory",
    "InventoryItem",
    "StockMovement",
    "Purchase",
    "Voucher",
    "Product",
]
