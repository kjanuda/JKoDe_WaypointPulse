from datetime import datetime
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.order import Order
from app.models.trip import Trip
from app.models.trip_stop import TripStop
from app.models.user import User
from app.routers.auth import require_role


router = APIRouter(
    prefix="/api/store",
    tags=["store"],
)


class ConfirmReceiptRequest(BaseModel):
    confirmed_by: str
    note: Optional[str] = None


@router.get("/deliveries")
def get_store_deliveries(
    outlet_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("store")),
):
    rows = (
        db.query(
            TripStop,
            Order,
            Trip,
        )
        .join(
            Order,
            TripStop.order_id == Order.id,
        )
        .join(
            Trip,
            TripStop.trip_id == Trip.id,
        )
        .filter(
            Order.outlet_id == outlet_id,
            TripStop.driver_status == "delivered",
        )
        .order_by(
            TripStop.id.desc()
        )
        .all()
    )

    deliveries = []

    for stop, order, trip in rows:
        deliveries.append(
            {
                "stop_id": stop.id,
                "delivery_id": order.delivery_id,
                "outlet_id": order.outlet_id,
                "brand": order.brand,
                "district": order.district,
                "temp_requirement": order.temp_requirement,
                "weight_kg": order.order_weight_kg,
                "volume_m3": order.order_volume_m3,
                "vehicle_id": trip.vehicle_id,
                "trip_number": trip.trip_number,
                "trip_status": trip.status,
                "driver_status": stop.driver_status,
                "receiver_name": stop.receiver_name,
                "delivery_note": stop.delivery_note,
                "delivered_at": stop.delivered_at,
                "receipt_status": stop.receipt_status,
                "receipt_note": stop.receipt_note,
                "receipt_confirmed_by": (
                    stop.receipt_confirmed_by
                ),
                "receipt_confirmed_at": (
                    stop.receipt_confirmed_at
                ),
            }
        )

    return {
        "outlet_id": outlet_id,
        "delivery_count": len(deliveries),
        "pending_receipts": sum(
            1
            for item in deliveries
            if item["receipt_status"] != "confirmed"
        ),
        "deliveries": deliveries,
    }


@router.patch(
    "/deliveries/{stop_id}/confirm"
)
def confirm_receipt(
    stop_id: int,
    payload: ConfirmReceiptRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("store")),
):
    stop = (
        db.query(TripStop)
        .filter(
            TripStop.id == stop_id
        )
        .first()
    )

    if not stop:
        raise HTTPException(
            status_code=404,
            detail="Delivery stop not found",
        )

    if stop.driver_status != "delivered":
        raise HTTPException(
            status_code=400,
            detail=(
                "Delivery must be completed "
                "before receipt confirmation"
            ),
        )

    confirmed_by = (
        payload.confirmed_by.strip()
    )

    if not confirmed_by:
        raise HTTPException(
            status_code=400,
            detail="Confirmed by name is required",
        )

    stop.receipt_status = "confirmed"

    stop.receipt_confirmed_by = (
        confirmed_by
    )

    stop.receipt_note = (
        payload.note.strip()
        if payload.note
        else None
    )

    if not stop.receipt_confirmed_at:
        stop.receipt_confirmed_at = (
            datetime.utcnow()
        )

    db.commit()
    db.refresh(stop)

    return {
        "stop_id": stop.id,
        "receipt_status": stop.receipt_status,
        "receipt_confirmed_by": (
            stop.receipt_confirmed_by
        ),
        "receipt_note": stop.receipt_note,
        "receipt_confirmed_at": (
            stop.receipt_confirmed_at
        ),
    }