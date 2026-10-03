from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.outlet import Outlet


router = APIRouter(
    prefix="/api/outlets",
    tags=["Outlets"],
)


@router.get("/")
def get_outlets(db: Session = Depends(get_db)):
    outlets = (
        db.query(Outlet)
        .order_by(Outlet.outlet_id)
        .all()
    )

    return [
        {
            "outlet_id": outlet.outlet_id,
            "brand": outlet.brand,
            "district": outlet.district,
            "depot": outlet.depot,
            "dock_type": outlet.dock_type,
            "parking_constraint": outlet.parking_constraint,
            "mall_window": outlet.mall_window,
            "window_open_time": outlet.window_open_time,
            "window_close_time": outlet.window_close_time,
        }
        for outlet in outlets
    ]


@router.get("/{outlet_id}")
def get_outlet(
    outlet_id: str,
    db: Session = Depends(get_db),
):
    outlet = (
        db.query(Outlet)
        .filter(Outlet.outlet_id == outlet_id)
        .first()
    )

    if not outlet:
        raise HTTPException(
            status_code=404,
            detail="Outlet not found",
        )

    return {
        "outlet_id": outlet.outlet_id,
        "brand": outlet.brand,
        "district": outlet.district,
        "depot": outlet.depot,
        "dock_type": outlet.dock_type,
        "parking_constraint": outlet.parking_constraint,
        "mall_window": outlet.mall_window,
        "window_open_time": outlet.window_open_time,
        "window_close_time": outlet.window_close_time,
    }