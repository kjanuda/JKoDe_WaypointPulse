from sqlalchemy import Column, Integer, String

from app.database import Base


class VehicleAvailability(Base):
    __tablename__ = "vehicle_availability"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    scenario = Column(
        String,
        nullable=False,
        index=True,
    )

    vehicle_id = Column(
        String,
        nullable=False,
        index=True,
    )

    status = Column(
        String,
        nullable=False,
        index=True,
    )