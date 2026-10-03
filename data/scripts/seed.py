import csv
from datetime import datetime
from pathlib import Path
from app.models.order import Order

from app.database import SessionLocal
from app.models.outlet import Outlet
from app.models.vehicle import Vehicle
from app.models.calendar_day import CalendarDay


BASE_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = BASE_DIR / "data" / "seed"


def to_bool(value):
    return str(value).strip() == "1"


def seed_outlets(db):
    path = DATA_DIR / "outlets.csv"

    with open(path, newline="", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)

        count = 0

        for row in reader:
            existing = (
                db.query(Outlet)
                .filter(Outlet.outlet_id == row["outlet_id"])
                .first()
            )

            if existing:
                continue

            outlet = Outlet(
                outlet_id=row["outlet_id"],
                brand=row["brand"],
                district=row["district"],
                depot=row["depot"],
                dock_type=row["dock_type"],
                parking_constraint=row["parking_constraint"],
                mall_window=row["mall_window"] or None,
                window_open_time=row["window_open_time"],
                window_close_time=row["window_close_time"],
            )

            db.add(outlet)
            count += 1

        db.commit()

    print(f"Outlets seeded: {count}")


def seed_vehicles(db):
    path = DATA_DIR / "vehicles.csv"

    with open(path, newline="", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)

        count = 0

        for row in reader:
            existing = (
                db.query(Vehicle)
                .filter(Vehicle.vehicle_id == row["vehicle_id"])
                .first()
            )

            if existing:
                continue

            vehicle = Vehicle(
                vehicle_id=row["vehicle_id"],
                type=row["type"],
                temp=row["temp"],
                weight_cap_kg=float(row["weight_cap_kg"]),
                volume_cap_m3=float(row["volume_cap_m3"]),
                fuel_type=row["fuel_type"],
                km_per_l=float(row["km_per_l"]),
                weekly_fuel_quota_l=float(row["weekly_fuel_quota_l"]),
                depot=row["depot"],
            )

            db.add(vehicle)
            count += 1

        db.commit()

    print(f"Vehicles seeded: {count}")


def seed_calendar(db):
    path = DATA_DIR / "calendar.csv"

    with open(path, newline="", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)

        count = 0

        for row in reader:
            date_value = datetime.strptime(
                row["date"],
                "%Y-%m-%d",
            ).date()

            existing = (
                db.query(CalendarDay)
                .filter(CalendarDay.date == date_value)
                .first()
            )

            if existing:
                continue

            calendar_day = CalendarDay(
                date=date_value,
                dow=int(row["dow"]),
                dow_name=row["dow_name"],
                is_weekend=to_bool(row["is_weekend"]),
                iso_year=int(row["iso_year"]),
                iso_week=int(row["iso_week"]),
                is_payday=to_bool(row["is_payday"]),
                festival=row["festival"] or None,
                festival_ramp=float(row["festival_ramp"]),
                is_holiday=to_bool(row["is_holiday"]),
                monsoon=to_bool(row["monsoon"]),
                is_operating=to_bool(row["is_operating"]),
            )

            db.add(calendar_day)
            count += 1

        db.commit()

    print(f"Calendar rows seeded: {count}")


def main():
    db = SessionLocal()

    try:
        print("Starting Waypoint Pulse dataset seeding...")
        print(f"Dataset folder: {DATA_DIR}")
        print()

        seed_outlets(db)
        seed_vehicles(db)
        seed_calendar(db)

        print()
        print("Seed completed successfully.")

    except Exception as error:
        db.rollback()
        print(f"Seed failed: {error}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()