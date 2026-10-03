import csv

from datetime import datetime
from pathlib import Path

from app.database import SessionLocal

from app.models.outlet import Outlet
from app.models.vehicle import Vehicle
from app.models.calendar_day import CalendarDay
from app.models.order import Order
from app.models.service_allowance import ServiceAllowance
from app.models.district_travel import DistrictTravel
from app.models.vehicle_availability import (
    VehicleAvailability,
)


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
            outlet_id = row["outlet_id"].strip()

            if not outlet_id:
                continue

            existing = (
                db.query(Outlet)
                .filter(Outlet.outlet_id == outlet_id)
                .first()
            )

            if existing:
                continue

            outlet = Outlet(
                outlet_id=outlet_id,
                brand=row["brand"].strip(),
                district=row["district"].strip(),
                depot=row["depot"].strip(),
                dock_type=row["dock_type"].strip(),
                parking_constraint=row["parking_constraint"].strip(),
                mall_window=row["mall_window"].strip() or None,
                window_open_time=row["window_open_time"].strip(),
                window_close_time=row["window_close_time"].strip(),
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
            vehicle_id = row["vehicle_id"].strip()

            if not vehicle_id:
                continue

            existing = (
                db.query(Vehicle)
                .filter(Vehicle.vehicle_id == vehicle_id)
                .first()
            )

            if existing:
                continue

            vehicle = Vehicle(
                vehicle_id=vehicle_id,
                type=row["type"].strip(),
                temp=row["temp"].strip(),
                weight_cap_kg=float(row["weight_cap_kg"]),
                volume_cap_m3=float(row["volume_cap_m3"]),
                fuel_type=row["fuel_type"].strip(),
                km_per_l=float(row["km_per_l"]),
                weekly_fuel_quota_l=float(
                    row["weekly_fuel_quota_l"]
                ),
                depot=row["depot"].strip(),
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
                row["date"].strip(),
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
                dow_name=row["dow_name"].strip(),
                is_weekend=to_bool(row["is_weekend"]),
                iso_year=int(row["iso_year"]),
                iso_week=int(row["iso_week"]),
                is_payday=to_bool(row["is_payday"]),
                festival=row["festival"].strip() or None,
                festival_ramp=float(row["festival_ramp"]),
                is_holiday=to_bool(row["is_holiday"]),
                monsoon=to_bool(row["monsoon"]),
                is_operating=to_bool(row["is_operating"]),
            )

            db.add(calendar_day)
            count += 1

        db.commit()

    print(f"Calendar rows seeded: {count}")


def seed_orders(db):
    path = DATA_DIR / "deliveries_train.csv"

    print(f"Reading orders from: {path}")

    with open(path, newline="", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)

        required_columns = {
            "delivery_id",
            "order_date",
            "dispatch_date",
            "dispatch_status",
            "outlet_id",
            "brand",
            "district",
            "depot",
            "temp_requirement",
            "order_units",
            "order_weight_kg",
            "order_volume_m3",
            "route_id",
            "seq_in_route",
            "vehicle_id",
            "vehicle_type",
            "vehicle_temp",
            "planned_arrival_time",
            "window_open_time",
            "window_close_time",
        }

        actual_columns = set(reader.fieldnames or [])

        missing_columns = required_columns - actual_columns

        if missing_columns:
            raise ValueError(
                "Missing columns in deliveries_train.csv: "
                f"{sorted(missing_columns)}"
            )

        print("CSV columns verified successfully.")
        print(f"Columns found: {len(actual_columns)}")

        count = 0

        for row in reader:
            delivery_id = row["delivery_id"].strip()

            if not delivery_id:
                continue

            existing = (
                db.query(Order)
                .filter(Order.delivery_id == delivery_id)
                .first()
            )

            if existing:
                continue

            order_date_raw = row["order_date"].strip()

            if not order_date_raw:
                continue

            order_date = datetime.strptime(
                order_date_raw,
                "%Y-%m-%d",
            ).date()

            dispatch_date_raw = row["dispatch_date"].strip()

            dispatch_date = None

            if dispatch_date_raw:
                dispatch_date = datetime.strptime(
                    dispatch_date_raw,
                    "%Y-%m-%d",
                ).date()

            units_raw = row["order_units"].strip()

            order_units = (
                int(units_raw)
                if units_raw
                else 0
            )

            weight_raw = row["order_weight_kg"].strip()

            order_weight_kg = (
                float(weight_raw)
                if weight_raw
                else 0.0
            )

            volume_raw = row["order_volume_m3"].strip()

            order_volume_m3 = (
                float(volume_raw)
                if volume_raw
                else 0.0
            )

            # Empty seq_in_route values are allowed.
            seq_raw = row["seq_in_route"].strip()

            seq_in_route = (
                int(seq_raw)
                if seq_raw
                else None
            )

            route_id = row["route_id"].strip() or None

            vehicle_id = row["vehicle_id"].strip() or None

            vehicle_type = row["vehicle_type"].strip() or None

            vehicle_temp = row["vehicle_temp"].strip() or None

            planned_arrival_time = (
                row["planned_arrival_time"].strip()
                or None
            )

            dispatch_status = row["dispatch_status"].strip()

            outlet_id = row["outlet_id"].strip()

            brand = row["brand"].strip()

            district = row["district"].strip()

            depot = row["depot"].strip()

            temp_requirement = row["temp_requirement"].strip()

            window_open_time = row["window_open_time"].strip()

            window_close_time = row["window_close_time"].strip()

            order = Order(
                delivery_id=delivery_id,
                order_date=order_date,
                dispatch_date=dispatch_date,
                dispatch_status=dispatch_status,
                outlet_id=outlet_id,
                brand=brand,
                district=district,
                depot=depot,
                temp_requirement=temp_requirement,
                order_units=order_units,
                order_weight_kg=order_weight_kg,
                order_volume_m3=order_volume_m3,
                route_id=route_id,
                seq_in_route=seq_in_route,
                vehicle_id=vehicle_id,
                vehicle_type=vehicle_type,
                vehicle_temp=vehicle_temp,
                planned_arrival_time=planned_arrival_time,
                window_open_time=window_open_time,
                window_close_time=window_close_time,
            )

            db.add(order)

            count += 1

            if count % 1000 == 0:
                db.commit()
                print(f"Orders seeded: {count}")

        db.commit()

    print(f"Orders seeded total: {count}")


def seed_service_allowances(db):
    path = DATA_DIR / "service_allowance.csv"

    with open(path, newline="", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)

        count = 0

        for row in reader:
            brand = row["brand"].strip()
            dock_type = row["dock_type"].strip()

            if not brand or not dock_type:
                continue

            existing = (
                db.query(ServiceAllowance)
                .filter(
                    ServiceAllowance.brand == brand,
                    ServiceAllowance.dock_type == dock_type,
                )
                .first()
            )

            if existing:
                continue

            item = ServiceAllowance(
                brand=brand,
                dock_type=dock_type,
                service_allowance_min=int(
                    row["service_allowance_min"]
                ),
            )

            db.add(item)
            count += 1

        db.commit()

    print(f"Service allowances seeded: {count}")


def seed_district_travel(db):
    path = DATA_DIR / "district_travel.csv"

    print(f"Reading district travel from: {path}")

    with open(path, newline="", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)

        print(
            "District travel columns:",
            reader.fieldnames,
        )

        required_columns = {
            "district",
            "depot",
            "road_class",
            "free_flow_kmh",
            "depot_to_district_km",
            "depot_to_district_freeflow_min",
            "inter_stop_km",
            "inter_stop_freeflow_min",
        }

        actual_columns = set(reader.fieldnames or [])

        missing_columns = required_columns - actual_columns

        if missing_columns:
            raise ValueError(
                "Missing columns in district_travel.csv: "
                f"{sorted(missing_columns)}"
            )

        count = 0

        for row in reader:
            district = row["district"].strip()
            depot = row["depot"].strip()

            if not district or not depot:
                continue

            existing = (
                db.query(DistrictTravel)
                .filter(
                    DistrictTravel.district == district,
                    DistrictTravel.depot == depot,
                )
                .first()
            )

            if existing:
                continue

            item = DistrictTravel(
                district=district,
                depot=depot,
                road_class=row["road_class"].strip(),
                free_flow_kmh=float(
                    row["free_flow_kmh"]
                ),
                depot_to_district_km=float(
                    row["depot_to_district_km"]
                ),
                depot_to_district_freeflow_min=int(
                    row["depot_to_district_freeflow_min"]
                ),
                inter_stop_km=float(
                    row["inter_stop_km"]
                ),
                inter_stop_freeflow_min=int(
                    row["inter_stop_freeflow_min"]
                ),
            )

            db.add(item)
            count += 1

        db.commit()

    print(f"District travel rows seeded: {count}")


def seed_vehicle_availability(db):
    path = (
        DATA_DIR
        / "task2b_peak_day_fleet.csv"
    )

    print(
        f"Reading vehicle availability from: "
        f"{path}"
    )

    with open(
        path,
        newline="",
        encoding="utf-8-sig",
    ) as file:
        reader = csv.DictReader(file)

        required_columns = {
            "scenario",
            "vehicle_id",
            "status",
        }

        actual_columns = set(
            reader.fieldnames or []
        )

        missing_columns = (
            required_columns - actual_columns
        )

        if missing_columns:
            raise ValueError(
                "Missing columns in "
                "task2b_peak_day_fleet.csv: "
                f"{sorted(missing_columns)}"
            )

        print(
            "Vehicle availability columns "
            "verified successfully."
        )

        count = 0

        for row in reader:
            scenario = row["scenario"].strip()
            vehicle_id = row["vehicle_id"].strip()
            status = row["status"].strip()

            if (
                not scenario
                or not vehicle_id
                or not status
            ):
                continue

            existing = (
                db.query(VehicleAvailability)
                .filter(
                    VehicleAvailability.scenario
                    == scenario,
                    VehicleAvailability.vehicle_id
                    == vehicle_id,
                )
                .first()
            )

            if existing:
                continue

            item = VehicleAvailability(
                scenario=scenario,
                vehicle_id=vehicle_id,
                status=status,
            )

            db.add(item)
            count += 1

        db.commit()

    print(
        f"Vehicle availability rows seeded: "
        f"{count}"
    )


def main():
    db = SessionLocal()

    try:
        print(
            "Starting Waypoint Pulse "
            "dataset seeding..."
        )
        print(f"Dataset folder: {DATA_DIR}")
        print()

        seed_outlets(db)

        seed_vehicles(db)

        seed_calendar(db)

        seed_orders(db)

        seed_service_allowances(db)

        seed_district_travel(db)

        seed_vehicle_availability(db)

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