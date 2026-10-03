from sqlalchemy import Column, Integer, String

from app.database import Base


class Outlet(Base):
    __tablename__ = "outlets"

    id = Column(Integer, primary_key=True)

    outlet_id = Column(
        String,
        unique=True,
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

    dock_type = Column(
        String,
        nullable=False,
    )

    parking_constraint = Column(
        String,
        nullable=False,
    )

    mall_window = Column(
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