from fastapi import APIRouter, Depends

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.outlet import Outlet
from app.models.vehicle import Vehicle
from app.models.calendar_day import CalendarDay
from app.models.user import User
from app.routers.auth import require_role


router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)


@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("dispatcher")),
):
    total_outlets = db.query(func.count(Outlet.id)).scalar()

    total_vehicles = db.query(func.count(Vehicle.id)).scalar()

    reefer_vehicles = (
        db.query(func.count(Vehicle.id))
        .filter(Vehicle.temp == "reefer")
        .scalar()
    )

    vans = (
        db.query(func.count(Vehicle.id))
        .filter(Vehicle.type == "van")
        .scalar()
    )

    peliyagoda_outlets = (
        db.query(func.count(Outlet.id))
        .filter(Outlet.depot == "Peliyagoda")
        .scalar()
    )

    kandy_outlets = (
        db.query(func.count(Outlet.id))
        .filter(Outlet.depot == "Kandy")
        .scalar()
    )

    operating_days = (
        db.query(func.count(CalendarDay.id))
        .filter(CalendarDay.is_operating.is_(True))
        .scalar()
    )

    return {
        "outlets": {
            "total": total_outlets,
            "peliyagoda": peliyagoda_outlets,
            "kandy": kandy_outlets,
        },
        "vehicles": {
            "total": total_vehicles,
            "reefer": reefer_vehicles,
            "vans": vans,
        },
        "calendar": {
            "operating_days": operating_days,
        },
    }