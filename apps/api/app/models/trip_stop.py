from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)

from app.database import Base


class TripStop(Base):
    __tablename__ = "trip_stops"

    id = Column(
        Integer,
        primary_key=True,
    )

    trip_id = Column(
        Integer,
        ForeignKey("trips.id"),
        nullable=False,
    )

    order_id = Column(
        Integer,
        ForeignKey("orders.id"),
        nullable=False,
    )

    stop_sequence = Column(
        Integer,
        nullable=False,
    )

    arrival_time = Column(
        String,
        nullable=True,
    )

    window_open = Column(
        String,
        nullable=True,
    )

    window_close = Column(
        String,
        nullable=True,
    )

    waiting_minutes = Column(
        Integer,
        default=0,
    )

    loader_note = Column(
        Text,
        nullable=True,
    )

    status = Column(
        String,
        default="planned",
        nullable=False,
    )

    driver_status = Column(
        String,
        default="pending",
        nullable=False,
    )

    receiver_name = Column(
        String,
        nullable=True,
    )

    delivery_note = Column(
        Text,
        nullable=True,
    )

    delivered_at = Column(
        DateTime,
        nullable=True,
    )

    receipt_status = Column(
        String,
        default="pending",
        nullable=False,
    )

    receipt_note = Column(
        Text,
        nullable=True,
    )

    receipt_confirmed_by = Column(
        String,
        nullable=True,
    )

    receipt_confirmed_at = Column(
        DateTime,
        nullable=True,
    )