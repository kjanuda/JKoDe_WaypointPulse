from typing import Literal, Optional

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
    prefix="/api/loader",
    tags=["loader"],
)


class StopVerificationRequest(BaseModel):
    status: Literal[
        "verified",
        "shortfall",
    ]

    note: Optional[str] = None


@router.patch("/stops/{stop_id}")
def update_stop_verification(
    stop_id: int,
    payload: StopVerificationRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("loader")),
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
            detail="Trip stop not found",
        )

    if (
        payload.status == "shortfall"
        and not payload.note
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "A note is required "
                "for a shortfall"
            ),
        )

    stop.status = payload.status

    if payload.status == "shortfall":
        stop.loader_note = (
            payload.note.strip()
        )

    else:
        stop.loader_note = None

    trip = (
        db.query(Trip)
        .filter(
            Trip.id == stop.trip_id
        )
        .first()
    )

    if trip and trip.status == "ready":
        trip.status = "planned"

    db.commit()
    db.refresh(stop)

    return {
        "stop_id": stop.id,
        "trip_id": stop.trip_id,
        "status": stop.status,
        "loader_note": stop.loader_note,
    }


@router.patch(
    "/trips/{trip_id}/ready"
)
def mark_trip_ready(
    trip_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("loader")),
):
    trip = (
        db.query(Trip)
        .filter(
            Trip.id == trip_id
        )
        .first()
    )

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found",
        )

    stops = (
        db.query(TripStop)
        .filter(
            TripStop.trip_id == trip_id
        )
        .all()
    )

    if not stops:
        raise HTTPException(
            status_code=400,
            detail="Trip has no stops",
        )

    shortfalls = [
        stop
        for stop in stops
        if stop.status == "shortfall"
    ]

    if shortfalls:
        raise HTTPException(
            status_code=409,
            detail=(
                "Trip cannot be released "
                "while shortfalls exist"
            ),
        )

    unverified = [
        stop
        for stop in stops
        if stop.status != "verified"
    ]

    if unverified:
        raise HTTPException(
            status_code=409,
            detail=(
                "All load items must "
                "be verified first"
            ),
        )

    trip.status = "ready"

    db.commit()
    db.refresh(trip)

    return {
        "trip_id": trip.id,
        "vehicle_id": trip.vehicle_id,
        "trip_number": trip.trip_number,
        "status": trip.status,
        "message": "Vehicle ready for dispatch",
    }


@router.get(
    "/trips/{trip_id}"
)
def get_loader_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("loader")),
):
    trip = (
        db.query(Trip)
        .filter(
            Trip.id == trip_id
        )
        .first()
    )

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found",
        )

    rows = (
        db.query(
            TripStop,
            Order,
        )
        .join(
            Order,
            TripStop.order_id
            == Order.id,
        )
        .filter(
            TripStop.trip_id == trip_id
        )
        .order_by(
            TripStop.stop_sequence.asc()
        )
        .all()
    )

    stops = []

    for stop, order in rows:
        stops.append(
            {
                "stop_id": stop.id,
                "sequence": stop.stop_sequence,
                "status": stop.status,
                "loader_note": stop.loader_note,
                "arrival_time": stop.arrival_time,
                "window_open": stop.window_open,
                "window_close": stop.window_close,
                "waiting_minutes": stop.waiting_minutes,
                "order": {
                    "delivery_id": order.delivery_id,
                    "outlet_id": order.outlet_id,
                    "brand": order.brand,
                    "district": order.district,
                    "temp_requirement": order.temp_requirement,
                    "weight_kg": order.order_weight_kg,
                    "volume_m3": order.order_volume_m3,
                },
            }
        )

    verified_count = sum(
        1
        for stop in stops
        if stop["status"] == "verified"
    )

    shortfall_count = sum(
        1
        for stop in stops
        if stop["status"] == "shortfall"
    )

    return {
        "trip_id": trip.id,
        "vehicle_id": trip.vehicle_id,
        "trip_number": trip.trip_number,
        "brand": trip.brand,
        "district": trip.district,
        "status": trip.status,
        "verified_count": verified_count,
        "shortfall_count": shortfall_count,
        "total_stops": len(stops),
        "stops": stops,
    }