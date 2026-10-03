from sqlalchemy import Column, Float, Integer, String

from app.database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True)

    vehicle_id = Column(
        String,
        unique=True,
        nullable=False,
        index=True,
    )

    type = Column(
        String,
        nullable=False,
    )

    temp = Column(
        String,
        nullable=False,
    )

    weight_cap_kg = Column(
        Float,
        nullable=False,
    )

    volume_cap_m3 = Column(
        Float,
        nullable=False,
    )

    fuel_type = Column(
        String,
        nullable=False,
    )

    km_per_l = Column(
        Float,
        nullable=False,
    )

    weekly_fuel_quota_l = Column(
        Float,
        nullable=False,
    )

    depot = Column(
        String,
        nullable=False,
        index=True,
    )