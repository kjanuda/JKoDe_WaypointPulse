
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


router = APIRouter(
    prefix="/api/driver",
    tags=["driver"],
)


class DeliveryRequest(BaseModel):
    receiver_name: str
    note: Optional[str] = None


@router.get("/trips/{trip_id}")
def get_driver_trip(
    trip_id: int,
    db: Session = Depends(get_db),
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
            TripStop.order_id == Order.id,
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
                "sequence":
                    stop.stop_sequence,

                "loader_status":
                    stop.status,

                "driver_status":
                    stop.driver_status,

                "receiver_name":
                    stop.receiver_name,

                "delivery_note":
                    stop.delivery_note,

                "delivered_at":
                    stop.delivered_at,

                "arrival_time":
                    stop.arrival_time,

                "window_open":
                    stop.window_open,

                "window_close":
                    stop.window_close,

                "order": {
                    "delivery_id":
                        order.delivery_id,

                    "outlet_id":
                        order.outlet_id,

                    "brand":
                        order.brand,

                    "district":
                        order.district,

                    "temp_requirement":
                        order.temp_requirement,

                    "weight_kg":
                        order.order_weight_kg,

                    "volume_m3":
                        order.order_volume_m3,
                },
            }
        )

    delivered_count = sum(
        1
        for stop in stops
        if stop["driver_status"]
        == "delivered"
    )

    return {
        "trip_id":
            trip.id,

        "vehicle_id":
            trip.vehicle_id,

        "trip_number":
            trip.trip_number,

        "brand":
            trip.brand,

        "district":
            trip.district,

        "status":
            trip.status,

        "distance_km":
            trip.distance_km,

        "trip_start":
            trip.trip_start,

        "trip_end":
            trip.trip_end,

        "delivered_count":
            delivered_count,

        "total_stops":
            len(stops),

        "stops":
            stops,
    }


@router.patch(
    "/stops/{stop_id}/arrived"
)
def mark_stop_arrived(
    stop_id: int,
    db: Session = Depends(get_db),
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
            detail="Stop not found",
        )

    if stop.driver_status == "delivered":
        return {
            "stop_id": stop.id,
            "driver_status":
                stop.driver_status,
        }

    stop.driver_status = "arrived"

    db.commit()
    db.refresh(stop)

    return {
        "stop_id": stop.id,
        "driver_status":
            stop.driver_status,
    }


@router.patch(
    "/stops/{stop_id}/delivered"
)
def complete_delivery(
    stop_id: int,
    payload: DeliveryRequest,
    db: Session = Depends(get_db),
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
            detail="Stop not found",
        )

    receiver_name = (
        payload.receiver_name.strip()
    )

    if not receiver_name:
        raise HTTPException(
            status_code=400,
            detail=(
                "Receiver name is required"
            ),
        )

    # Idempotent:
    # repeated sync does not duplicate anything.
    stop.driver_status = "delivered"

    stop.receiver_name = receiver_name

    stop.delivery_note = (
        payload.note.strip()
        if payload.note
        else None
    )

    if not stop.delivered_at:
        stop.delivered_at = datetime.utcnow()

    db.commit()
    db.refresh(stop)

    return {
        "stop_id":
            stop.id,

        "driver_status":
            stop.driver_status,

        "receiver_name":
            stop.receiver_name,

        "delivery_note":
            stop.delivery_note,

        "delivered_at":
            stop.delivered_at,
    }


@router.patch(
    "/trips/{trip_id}/complete"
)
def complete_trip(
    trip_id: int,
    db: Session = Depends(get_db),
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

    incomplete_stops = [
        stop
        for stop in stops
        if stop.driver_status
        != "delivered"
    ]

    if incomplete_stops:
        raise HTTPException(
            status_code=400,
            detail={
                "message":
                    "All stops must be delivered before completing trip",
                "remaining_stops":
                    len(incomplete_stops),
            },
        )

    trip.status = "completed"

    db.commit()
    db.refresh(trip)

    return {
        "trip_id":
            trip.id,

        "vehicle_id":
            trip.vehicle_id,

        "trip_number":
            trip.trip_number,

        "status":
            trip.status,
    }

