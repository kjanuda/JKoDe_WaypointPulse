from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.order import Order
from app.models.outlet import Outlet
from app.models.vehicle import Vehicle
from app.models.district_travel import DistrictTravel
from app.models.service_allowance import ServiceAllowance
from app.models.vehicle_availability import VehicleAvailability
from app.models.user import User
from app.routers.auth import require_role
from app.planner.engine import generate_plan
from app.planner.validator import validate_order_for_vehicle
from app.services.plan_persistence import (
    persist_generated_plan,
)


router = APIRouter(
    prefix="/api/planner",
    tags=["Planner"],
)


@router.get("/validate")
def validate_assignment(
    delivery_id: str,
    vehicle_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("dispatcher")),
):
    order = (
        db.query(Order)
        .filter(Order.delivery_id == delivery_id)
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.vehicle_id == vehicle_id)
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found",
        )

    outlet = (
        db.query(Outlet)
        .filter(Outlet.outlet_id == order.outlet_id)
        .first()
    )

    if not outlet:
        raise HTTPException(
            status_code=404,
            detail="Outlet not found",
        )

    validation = validate_order_for_vehicle(
        order=order,
        outlet=outlet,
        vehicle=vehicle,
    )

    return {
        "delivery_id": order.delivery_id,
        "outlet_id": order.outlet_id,
        "vehicle_id": vehicle.vehicle_id,
        "order": {
            "brand": order.brand,
            "temp_requirement": order.temp_requirement,
            "weight_kg": order.order_weight_kg,
            "volume_m3": order.order_volume_m3,
        },
        "outlet": {
            "parking_constraint": outlet.parking_constraint,
            "depot": outlet.depot,
        },
        "vehicle": {
            "type": vehicle.type,
            "temp": vehicle.temp,
            "depot": vehicle.depot,
            "weight_cap_kg": vehicle.weight_cap_kg,
            "volume_cap_m3": vehicle.volume_cap_m3,
        },
        "validation": validation,
    }


@router.post("/generate")
def generate_delivery_plan(
    plan_date: date,
    depot: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("dispatcher")),
):
    # ---------------------------------------------------------
    # Get orders for the requested date and depot
    # ---------------------------------------------------------
    orders = (
        db.query(Order)
        .filter(
            Order.order_date == plan_date,
            Order.depot == depot,
        )
        .all()
    )

    if not orders:
        raise HTTPException(
            status_code=404,
            detail="No orders found for this date and depot.",
        )

    # ---------------------------------------------------------
    # Get outlets for the requested depot
    # ---------------------------------------------------------
    outlets = (
        db.query(Outlet)
        .filter(
            Outlet.depot == depot,
        )
        .all()
    )

    if not outlets:
        raise HTTPException(
            status_code=404,
            detail="No outlets found for this depot.",
        )

    # ---------------------------------------------------------
    # Get available vehicles
    #
    # Only vehicles from scenario S1 with status
    # "available" are allowed into the planner.
    #
    # Vehicles marked "in_workshop" will therefore be excluded.
    # ---------------------------------------------------------
    available_vehicle_ids = (
        db.query(
            VehicleAvailability.vehicle_id
        )
        .filter(
            VehicleAvailability.scenario == "S1",
            VehicleAvailability.status == "available",
        )
        .all()
    )

    available_vehicle_ids = [
        row[0]
        for row in available_vehicle_ids
    ]

    # ---------------------------------------------------------
    # Get vehicles for the requested depot
    # AND only vehicles available in scenario S1
    # ---------------------------------------------------------
    vehicles = (
        db.query(Vehicle)
        .filter(
            Vehicle.depot == depot,
            Vehicle.vehicle_id.in_(
                available_vehicle_ids
            ),
        )
        .all()
    )

    if not vehicles:
        raise HTTPException(
            status_code=404,
            detail=(
                "No available vehicles found for "
                f"depot '{depot}' in scenario S1."
            ),
        )

    # ---------------------------------------------------------
    # Create outlet lookup dictionary
    # ---------------------------------------------------------
    outlets_by_id = {
        outlet.outlet_id: outlet
        for outlet in outlets
    }

    # ---------------------------------------------------------
    # Load district travel data
    # ---------------------------------------------------------
    travel_rows = (
        db.query(DistrictTravel)
        .all()
    )

    travel_by_key = {
        (
            row.district,
            row.depot,
        ): row
        for row in travel_rows
    }

    # ---------------------------------------------------------
    # Load service allowance data
    # ---------------------------------------------------------
    service_rows = (
        db.query(ServiceAllowance)
        .all()
    )

    service_allowances = {
        (
            row.brand,
            row.dock_type,
        ): row.service_allowance_min
        for row in service_rows
    }

    # ---------------------------------------------------------
    # Generate delivery plan
    # ---------------------------------------------------------
    result = generate_plan(
        orders=orders,
        outlets_by_id=outlets_by_id,
        vehicles=vehicles,
        travel_by_key=travel_by_key,
        service_allowances=service_allowances,
    )

    # ---------------------------------------------------------
    # Persist generated plan
    #
    # The persistence service handles:
    # - creating the plan record
    # - version incrementing
    # - removing the existing draft for the same
    #   date/depot when regenerating
    # - saving generated trips/stops/deferrals
    # ---------------------------------------------------------
    persistence = persist_generated_plan(
        db=db,
        plan_date=plan_date,
        depot=depot,
        plan_result=result,
    )

    # ---------------------------------------------------------
    # Return generated + persisted plan
    # ---------------------------------------------------------
    return {
        "plan_date": plan_date,
        "depot": depot,
        "orders_count": len(orders),
        "vehicles_count": len(vehicles),
        "fleet_status": {
            "scenario": "S1",
            "available": len(
                available_vehicle_ids
            ),
        },
        "outlets_count": len(
            outlets_by_id
        ),
        "persistence": persistence,
        "plan": result,
    }