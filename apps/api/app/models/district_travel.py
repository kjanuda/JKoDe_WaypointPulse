from sqlalchemy import Column, Float, Integer, String

from app.database import Base


class DistrictTravel(Base):
    __tablename__ = "district_travel"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    district = Column(
        String,
        nullable=False,
        index=True,
    )

    depot = Column(
        String,
        nullable=False,
        index=True,
    )

    road_class = Column(
        String,
        nullable=False,
    )

    free_flow_kmh = Column(
        Float,
        nullable=False,
    )

    depot_to_district_km = Column(
        Float,
        nullable=False,
    )

    depot_to_district_freeflow_min = Column(
        Integer,
        nullable=False,
    )

    inter_stop_km = Column(
        Float,
        nullable=False,
    )

    inter_stop_freeflow_min = Column(
        Integer,
        nullable=False,
    )