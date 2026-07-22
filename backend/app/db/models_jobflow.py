"""Typed models for job-flow / ledger stores (UI list columns).

Previously these were flexible data_json-only tables — UI showed blank columns.
"""
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import String, Text, DateTime, Numeric, Integer, JSON, Float
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.db.models import TimestampMixin


def _utcnow() -> datetime:
    return datetime.utcnow()


class Inspection(Base, TimestampMixin):
    __tablename__ = "crm_inspections"
    __table_args__ = {"extend_existing": True}

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    status: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    vehicle_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    vehicleNo: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    party_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    partyName: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    customerId: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vehicle_model: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    vehicleModel: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    vehicle_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    km_reading: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    items: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class Estimate(Base, TimestampMixin):
    __tablename__ = "crm_estimates"
    __table_args__ = {"extend_existing": True}

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    estimate_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    status: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    vehicle_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    vehicleNo: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    party_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    partyName: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    customerId: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    total_amount: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    grand_total: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    advance: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    items: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class Jobsheet(Base, TimestampMixin):
    __tablename__ = "crm_jobsheets"
    __table_args__ = {"extend_existing": True}

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    job_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    status: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    vehicle_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    vehicleNo: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    party_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    partyName: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    customerId: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    total_amount: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    items: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class Invoice(Base, TimestampMixin):
    __tablename__ = "crm_invoices"
    __table_args__ = {"extend_existing": True}

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    invoice_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    status: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    vehicle_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    vehicleNo: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    party_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    partyName: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    customerId: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    total_amount: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    grand_total: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    paid_amount: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    balance: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    items: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class Challan(Base, TimestampMixin):
    __tablename__ = "crm_challan"
    __table_args__ = {"extend_existing": True}

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    challan_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    status: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    vehicle_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    vehicleNo: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    party_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    partyName: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    customerId: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    total_amount: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    items: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class SellChallan(Base, TimestampMixin):
    __tablename__ = "crm_sellchallan"
    __table_args__ = {"extend_existing": True}

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    challan_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    status: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    vehicle_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    vehicleNo: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    party_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    partyName: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    customerId: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    total_amount: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    items: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class CashReceipt(Base, TimestampMixin):
    __tablename__ = "crm_cash_receipts"
    __table_args__ = {"extend_existing": True}

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    receipt_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    status: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    customerId: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    party_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vehicle_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    amount: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    payment_mode: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class CustomerLedgerEntry(Base, TimestampMixin):
    __tablename__ = "crm_customer_ledger_entries"
    __table_args__ = {"extend_existing": True}

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    status: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    customerId: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    particular: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    debit: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    credit: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    balance: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    reference_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    reference_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    vehicle_no: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class DailyTask(Base, TimestampMixin):
    __tablename__ = "crm_daily_tasks"
    __table_args__ = {"extend_existing": True}

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    status: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    assigned_to: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    priority: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


__all__ = [
    "Inspection",
    "Estimate",
    "Jobsheet",
    "Invoice",
    "Challan",
    "SellChallan",
    "CashReceipt",
    "CustomerLedgerEntry",
    "DailyTask",
]
