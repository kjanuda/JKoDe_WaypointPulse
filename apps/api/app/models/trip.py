from sqlalchemy import Column, Float, ForeignKey, Integer, String

from app.database import Base


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True)

    plan_id = Column(
        Integer,
        ForeignKey("plans.id"),
        nullable=False,
    )

    vehicle_id = Column(
        String,
        ForeignKey("vehicles.vehicle_id"),
        nullable=False,
    )

    trip_number = Column(
        Integer,
        nullable=False,
    )

    brand = Column(
        String,
        nullable=False,
    )

    district = Column(
        String,
        nullable=False,
    )

    total_weight_kg = Column(
        Float,
        default=0,
    )

    total_volume_m3 = Column(
        Float,
        default=0,
    )

    estimated_minutes = Column(
        Float,
        default=0,
    )

    distance_km = Column(
        Float,
        default=0,
    )

    fuel_l = Column(
        Float,
        default=0,
    )

    trip_start = Column(
        String,
        nullable=True,
    )

    trip_end = Column(
        String,
        nullable=True,
    )

    status = Column(
        String,
        default="planned",
    )