from sqlalchemy import Column, Date, Integer, String

from app.database import Base


class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True)

    plan_date = Column(
        Date,
        nullable=False,
        index=True,
    )

    depot = Column(
        String,
        nullable=False,
    )

    status = Column(
        String,
        default="draft",
    )

    version = Column(
        Integer,
        default=1,
    )