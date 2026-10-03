from fastapi import APIRouter, Depends, HTTPException


from sqlalchemy.orm import Session

from app.database import get_db
from app.models.plan import Plan
from app.models.trip import Trip
from app.models.trip_stop import TripStop
from app.models.deferral import Deferral
from app.models.order import Order


router = APIRouter(
    prefix="/api/plans",
    tags=["plans"],
)


@router.get("/latest")
def get_latest_plan(
    depot: str,
    db: Session = Depends(get_db),
):
    plan = (
        db.query(Plan)
        .filter(
            Plan.depot == depot,
        )
        .order_by(
            Plan.plan_date.desc(),
            Plan.version.desc(),
        )
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="No plan found",
        )

    return build_plan_response(
        db,
        plan,
    )


@router.get("/{plan_id}")
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
):
    plan = (
        db.query(Plan)
        .filter(
            Plan.id == plan_id
        )
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="Plan not found",
        )

    return build_plan_response(
        db,
        plan,
    )


def build_plan_response(
    db: Session,
    plan: Plan,
):
    trips = (
        db.query(Trip)
        .filter(
            Trip.plan_id == plan.id
        )
        .order_by(
            Trip.vehicle_id,
            Trip.trip_number,
        )
        .all()
    )

    trip_results = []

    for trip in trips:

        stops = (
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
                TripStop.trip_id
                == trip.id
            )
            .order_by(
                TripStop.stop_sequence
            )
            .all()
        )

        stop_results = []

        for stop, order in stops:
            stop_results.append(
                {
                    "stop_id": stop.id,
                    "sequence":
                        stop.stop_sequence,
                    "status":
                        stop.status,
                    "arrival_time":
                        stop.arrival_time,
                    "window_open":
                        stop.window_open,
                    "window_close":
                        stop.window_close,
                    "waiting_minutes":
                        stop.waiting_minutes,
                    "order": {
                        "id": order.id,
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
                        "window_open":
                            order.window_open_time,
                        "window_close":
                            order.window_close_time,
                    },
                }
            )

        trip_results.append(
            {
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
                "total_weight_kg":
                    trip.total_weight_kg,
                "total_volume_m3":
                    trip.total_volume_m3,
                "estimated_minutes":
                    trip.estimated_minutes,
                "distance_km":
                    trip.distance_km,
                "fuel_l":
                    trip.fuel_l,
                "trip_start":
                    trip.trip_start,
                "trip_end":
                    trip.trip_end,
                "status":
                    trip.status,
                "stops":
                    stop_results,
            }
        )

    deferrals = (
        db.query(
            Deferral,
            Order,
        )
        .join(
            Order,
            Deferral.order_id
            == Order.id,
        )
        .filter(
            Deferral.plan_id
            == plan.id
        )
        .all()
    )

    deferral_results = []

    for deferral, order in deferrals:
        deferral_results.append(
            {
                "id":
                    deferral.id,
                "delivery_id":
                    order.delivery_id,
                "outlet_id":
                    order.outlet_id,
                "brand":
                    order.brand,
                "district":
                    order.district,
                "reason_code":
                    deferral.reason_code,
                "explanation":
                    deferral.explanation,
                "consecutive_deferrals":
                    deferral.consecutive_deferrals,
            }
        )

    return {
        "id": plan.id,
        "plan_date":
            plan.plan_date,
        "depot":
            plan.depot,
        "status":
            plan.status,
        "version":
            plan.version,
        "trip_count":
            len(trip_results),
        "deferral_count":
            len(deferral_results),
        "trips":
            trip_results,
        "deferrals":
            deferral_results,
    }