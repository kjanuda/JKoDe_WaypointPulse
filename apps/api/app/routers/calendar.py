from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.calendar_day import CalendarDay


router = APIRouter(
    prefix="/api/calendar",
    tags=["Calendar"],
)


@router.get("/")
def get_calendar(db: Session = Depends(get_db)):
    days = (
        db.query(CalendarDay)
        .order_by(CalendarDay.date)
        .all()
    )

    return [
        {
            "date": day.date,
            "dow": day.dow,
            "dow_name": day.dow_name,
            "is_weekend": day.is_weekend,
            "iso_year": day.iso_year,
            "iso_week": day.iso_week,
            "is_payday": day.is_payday,
            "festival": day.festival,
            "festival_ramp": day.festival_ramp,
            "is_holiday": day.is_holiday,
            "monsoon": day.monsoon,
            "is_operating": day.is_operating,
        }
        for day in days
    ]