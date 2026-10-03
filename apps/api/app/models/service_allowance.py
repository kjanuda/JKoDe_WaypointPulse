from sqlalchemy import Column, Integer, String
from app.database import Base


class ServiceAllowance(Base):
    __tablename__ = "service_allowances"

    id = Column(Integer, primary_key=True)

    brand = Column(
        String,
        nullable=False,
        index=True,
    )

    dock_type = Column(
        String,
        nullable=False,
        index=True,
    )

    service_allowance_min = Column(
        Integer,
        nullable=False,
    )