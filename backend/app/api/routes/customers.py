import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.db.models import User, Customer
from app.schemas import CustomerCreate, CustomerUpdate, CustomerOut

router = APIRouter()


def _serialize(c: Customer) -> CustomerOut:
    return CustomerOut.model_validate(c)


@router.get("", response_model=list[CustomerOut])
def list_customers(
    q: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    skip: int = 0,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Customer).filter(Customer.deleted_at.is_(None))
    if status_filter:
        query = query.filter(Customer.status == status_filter)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Customer.name.like(like))
            | (Customer.phone.like(like))
            | (Customer.email.like(like))
            | (Customer.company.like(like))
        )
    rows = query.order_by(Customer.updated_at.desc()).offset(skip).limit(limit).all()
    return [_serialize(r) for r in rows]


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = db.get(Customer, customer_id)
    if not row or row.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return _serialize(row)


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    body: CustomerCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    cid = body.id or str(uuid.uuid4())
    if db.get(Customer, cid):
        raise HTTPException(status_code=409, detail="Customer id already exists")

    now = datetime.utcnow()
    row = Customer(
        id=cid,
        **body.model_dump(exclude={"id"}),
        created_at=now,
        updated_at=now,
        synced_from="server",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: str,
    body: CustomerUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = db.get(Customer, customer_id)
    if not row or row.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Customer not found")

    data = body.model_dump(exclude_unset=True)
    client_updated = data.pop("updated_at", None)
    # LWW: reject stale updates
    if client_updated and row.updated_at and client_updated < row.updated_at:
        raise HTTPException(
            status_code=409,
            detail="Conflict: server has a newer version",
        )

    for key, value in data.items():
        setattr(row, key, value)
    row.updated_at = datetime.utcnow()
    row.synced_from = "server"
    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.delete("/{customer_id}")
def delete_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = db.get(Customer, customer_id)
    if not row or row.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Customer not found")
    row.deleted_at = datetime.utcnow()
    row.status = "deleted"
    row.updated_at = datetime.utcnow()
    db.commit()
    return {"success": True, "id": customer_id}
