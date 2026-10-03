from sqlalchemy import (
    Column,
    Date,
    Float,
    ForeignKey,
    Integer,
    String,
)

from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(
        Integer,
        primary_key=True,
    )

    delivery_id = Column(
        String,
        unique=True,
        nullable=False,
        index=True,
    )

    order_date = Column(
        Date,
        nullable=False,
        index=True,
    )

    dispatch_date = Column(
        Date,
        nullable=True,
    )

    dispatch_status = Column(
        String,
        nullable=False,
        index=True,
    )

    outlet_id = Column(
        String,
        ForeignKey("outlets.outlet_id"),
        nullable=False,
        index=True,
    )

    brand = Column(
        String,
        nullable=False,
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

    temp_requirement = Column(
        String,
        nullable=False,
    )

    order_units = Column(
        Integer,
        nullable=False,
    )

    order_weight_kg = Column(
        Float,
        nullable=False,
    )

    order_volume_m3 = Column(
        Float,
        nullable=False,
    )

    route_id = Column(
        String,
        nullable=True,
    )

    seq_in_route = Column(
        Float,
        nullable=True,
    )

    vehicle_id = Column(
        String,
        nullable=True,
    )

    vehicle_type = Column(
        String,
        nullable=True,
    )

    vehicle_temp = Column(
        String,
        nullable=True,
    )

    planned_arrival_time = Column(
        String,
        nullable=True,
    )

    window_open_time = Column(
        String,
        nullable=False,
    )

    window_close_time = Column(
        String,
        nullable=False,
    )