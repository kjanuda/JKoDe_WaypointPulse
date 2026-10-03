from sqlalchemy import Boolean, Column, Date, Float, Integer, String

from app.database import Base


class CalendarDay(Base):
    __tablename__ = "calendar_days"

    id = Column(Integer, primary_key=True)

    date = Column(
        Date,
        unique=True,
        nullable=False,
        index=True,
    )

    dow = Column(
        Integer,
        nullable=False,
    )

    dow_name = Column(
        String,
        nullable=False,
    )

    is_weekend = Column(
        Boolean,
        nullable=False,
    )

    iso_year = Column(
        Integer,
        nullable=False,
    )

    iso_week = Column(
        Integer,
        nullable=False,
    )

    is_payday = Column(
        Boolean,
        nullable=False,
    )

    festival = Column(
        String,
        nullable=True,
    )

    festival_ramp = Column(
        Float,
        default=0,
    )

    is_holiday = Column(
        Boolean,
        nullable=False,
    )

    monsoon = Column(
        Boolean,
        nullable=False,
    )

    is_operating = Column(
        Boolean,
        nullable=False,
    )