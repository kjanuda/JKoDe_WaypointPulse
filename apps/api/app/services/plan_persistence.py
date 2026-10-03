
from sqlalchemy.orm import Session


from app.models.plan import Plan
from app.models.trip import Trip
from app.models.trip_stop import TripStop
from app.models.deferral import Deferral
from app.models.order import Order


def delete_existing_draft_plan(
    db: Session,
    plan_date,
    depot: str,
):
    existing_plans = (
        db.query(Plan)
        .filter(
            Plan.plan_date == plan_date,
            Plan.depot == depot,
            Plan.status == "draft",
        )
        .all()
    )

    for plan in existing_plans:

        trip_ids = [
            row[0]
            for row in (
                db.query(Trip.id)
                .filter(
                    Trip.plan_id == plan.id
                )
                .all()
            )
        ]

        if trip_ids:
            (
                db.query(TripStop)
                .filter(
                    TripStop.trip_id.in_(
                        trip_ids
                    )
                )
                .delete(
                    synchronize_session=False
                )
            )

        (
            db.query(Deferral)
            .filter(
                Deferral.plan_id == plan.id
            )
            .delete(
                synchronize_session=False
            )
        )

        (
            db.query(Trip)
            .filter(
                Trip.plan_id == plan.id
            )
            .delete(
                synchronize_session=False
            )
        )

        db.delete(plan)

    db.flush()


def get_next_version(
    db: Session,
    plan_date,
    depot: str,
):
    latest = (
        db.query(Plan)
        .filter(
            Plan.plan_date == plan_date,
            Plan.depot == depot,
        )
        .order_by(
            Plan.version.desc()
        )
        .first()
    )

    if not latest:
        return 1

    return latest.version + 1


def persist_generated_plan(
    db: Session,
    plan_date,
    depot: str,
    plan_result: dict,
):
    try:
        # -------------------------------------------------
        # Get next version BEFORE deleting the existing draft
        # -------------------------------------------------

        version = get_next_version(
            db=db,
            plan_date=plan_date,
            depot=depot,
        )

        # -------------------------------------------------
        # Delete previous draft after capturing the version
        # -------------------------------------------------

        delete_existing_draft_plan(
            db=db,
            plan_date=plan_date,
            depot=depot,
        )

        # -------------------------------------------------
        # Create new draft plan
        # -------------------------------------------------

        plan = Plan(
            plan_date=plan_date,
            depot=depot,
            status="draft",
            version=version,
        )

        db.add(plan)
        db.flush()

        assignments = plan_result.get(
            "assignments",
            []
        )

        deferred = plan_result.get(
            "deferred",
            []
        )

        grouped_trips = {}

        for assignment in assignments:

            key = (
                assignment["vehicle_id"],
                assignment["trip_number"],
            )

            grouped_trips.setdefault(
                key,
                []
            ).append(
                assignment
            )

        created_trip_count = 0
        created_stop_count = 0

        for (
            vehicle_id,
            trip_number,
        ), trip_assignments in (
            grouped_trips.items()
        ):

            first = trip_assignments[0]

            total_weight = sum(
                item["weight_kg"]
                for item in trip_assignments
            )

            total_volume = sum(
                item["volume_m3"]
                for item in trip_assignments
            )

            estimated_minutes = max(
                item[
                    "estimated_trip_minutes"
                ]
                for item in trip_assignments
            )

            # -------------------------------------------------
            # Get final trip metadata from vehicle_state
            # -------------------------------------------------

            vehicle_info = (
                plan_result
                .get("vehicle_state", {})
                .get(vehicle_id, {})
            )

            trips_state = vehicle_info.get(
                "trips",
                {}
            )

            trip_meta = (
                trips_state.get(trip_number)
                or trips_state.get(
                    str(trip_number)
                )
                or {}
            )

            # -------------------------------------------------
            # Create Trip using final vehicle_state metadata
            # -------------------------------------------------

            trip = Trip(
                plan_id=plan.id,
                vehicle_id=vehicle_id,
                trip_number=trip_number,
                brand=first["brand"],
                district=first["district"],
                total_weight_kg=round(
                    total_weight,
                    3,
                ),
                total_volume_m3=round(
                    total_volume,
                    3,
                ),
                estimated_minutes=(
                    estimated_minutes
                ),
                distance_km=trip_meta.get(
                    "distance_km",
                    0,
                ),
                fuel_l=trip_meta.get(
                    "fuel_l",
                    0,
                ),
                trip_start=trip_meta.get(
                    "trip_start"
                ),
                trip_end=trip_meta.get(
                    "trip_end"
                ),
                status="planned",
            )

            db.add(trip)
            db.flush()

            created_trip_count += 1

            # -------------------------------------------------
            # Get final stop schedule from vehicle_state
            # -------------------------------------------------

            schedule_by_delivery = {
                item["delivery_id"]: item
                for item in trip_meta.get(
                    "schedule",
                    []
                )
            }

            # -------------------------------------------------
            # Preserve assignment order
            # but persist schedule values from vehicle_state
            # -------------------------------------------------

            for sequence, assignment in enumerate(
                trip_assignments,
                start=1,
            ):

                order = (
                    db.query(Order)
                    .filter(
                        Order.delivery_id
                        == assignment[
                            "delivery_id"
                        ]
                    )
                    .first()
                )

                if not order:
                    raise ValueError(
                        "Order not found: "
                        f"{assignment['delivery_id']}"
                    )

                schedule_stop = (
                    schedule_by_delivery.get(
                        assignment[
                            "delivery_id"
                        ],
                        {}
                    )
                )

                stop = TripStop(
                    trip_id=trip.id,
                    order_id=order.id,
                    stop_sequence=sequence,
                    arrival_time=schedule_stop.get(
                        "arrival_time"
                    ),
                    window_open=schedule_stop.get(
                        "window_open"
                    ),
                    window_close=schedule_stop.get(
                        "window_close"
                    ),
                    waiting_minutes=schedule_stop.get(
                        "waiting_minutes",
                        0,
                    ),
                    status="planned",
                )

                db.add(stop)

                created_stop_count += 1

        created_deferral_count = 0

        for item in deferred:

            order = (
                db.query(Order)
                .filter(
                    Order.delivery_id
                    == item["delivery_id"]
                )
                .first()
            )

            if not order:
                raise ValueError(
                    "Deferred order not found: "
                    f"{item['delivery_id']}"
                )

            reason_codes = (
                item.get(
                    "reason_codes"
                )
                or [
                    "NO_FEASIBLE_ASSIGNMENT"
                ]
            )

            # Store primary reason only
            primary_reason = reason_codes[0]

            previous = (
                db.query(Deferral)
                .join(
                    Plan,
                    Deferral.plan_id
                    == Plan.id,
                )
                .filter(
                    Deferral.order_id
                    == order.id,
                )
                .order_by(
                    Deferral.id.desc()
                )
                .first()
            )

            consecutive = 1

            if previous:
                consecutive = (
                    previous.consecutive_deferrals
                    + 1
                )

            deferral = Deferral(
                order_id=order.id,
                plan_id=plan.id,
                reason_code=primary_reason,
                explanation=item.get(
                    "explanation"
                ),
                consecutive_deferrals=(
                    consecutive
                ),
            )

            db.add(deferral)

            created_deferral_count += 1

        # -------------------------------------------------
        # Commit entire generated plan
        # -------------------------------------------------

        db.commit()

        db.refresh(plan)

        return {
            "plan_id": plan.id,
            "version": plan.version,
            "status": plan.status,
            "trips_saved":
                created_trip_count,
            "stops_saved":
                created_stop_count,
            "deferrals_saved":
                created_deferral_count,
        }

    except Exception:
        db.rollback()
        raise

