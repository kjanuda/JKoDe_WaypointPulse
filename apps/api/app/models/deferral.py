from sqlalchemy import Column, ForeignKey, Integer, String, Text

from app.database import Base


class Deferral(Base):
    __tablename__ = "deferrals"

    id = Column(Integer, primary_key=True)

    order_id = Column(
        Integer,
        ForeignKey("orders.id"),
        nullable=False,
    )

    plan_id = Column(
        Integer,
        ForeignKey("plans.id"),
        nullable=False,
    )

    reason_code = Column(
        String,
        nullable=False,
    )

    explanation = Column(
        Text,
        nullable=True,
    )

    consecutive_deferrals = Column(
        Integer,
        default=1,
    )