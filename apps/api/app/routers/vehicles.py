from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vehicle import Vehicle


router = APIRouter(
    prefix="/api/vehicles",
    tags=["Vehicles"],
)


@router.get("/")
def get_vehicles(db: Session = Depends(get_db)):
    vehicles = (
        db.query(Vehicle)
        .order_by(Vehicle.vehicle_id)
        .all()
    )

    return [
        {
            "vehicle_id": vehicle.vehicle_id,
            "type": vehicle.type,
            "temp": vehicle.temp,
            "weight_cap_kg": vehicle.weight_cap_kg,
            "volume_cap_m3": vehicle.volume_cap_m3,
            "fuel_type": vehicle.fuel_type,
            "km_per_l": vehicle.km_per_l,
            "weekly_fuel_quota_l": vehicle.weekly_fuel_quota_l,
            "depot": vehicle.depot,
        }
        for vehicle in vehicles
    ]


@router.get("/{vehicle_id}")
def get_vehicle(
    vehicle_id: str,
    db: Session = Depends(get_db),
):
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

    return {
        "vehicle_id": vehicle.vehicle_id,
        "type": vehicle.type,
        "temp": vehicle.temp,
        "weight_cap_kg": vehicle.weight_cap_kg,
        "volume_cap_m3": vehicle.volume_cap_m3,
        "fuel_type": vehicle.fuel_type,
        "km_per_l": vehicle.km_per_l,
        "weekly_fuel_quota_l": vehicle.weekly_fuel_quota_l,
        "depot": vehicle.depot,
    }