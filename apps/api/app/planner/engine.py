from app.planner.validator import validate_order_for_vehicle

from app.planner.time_calculator import calculate_trip_minutes
from app.planner.schedule_calculator import (
    build_trip_schedule,
    parse_time,
)
from app.planner.fuel_calculator import (
    calculate_trip_distance_km,
    calculate_fuel_litres,
)


def build_deferral_explanation(reason_codes):
    messages = {
        "DEPOT_MISMATCH":
            "No compatible vehicle from the order's home depot.",

        "REEFER_REQUIRED":
            "Chilled order requires a reefer vehicle.",

        "VAN_REQUIRED":
            "Outlet can only be served by a van.",

        "WEIGHT_CAPACITY":
            "Vehicle weight capacity would be exceeded.",

        "VOLUME_CAPACITY":
            "Vehicle volume capacity would be exceeded.",

        "BRAND_MISMATCH":
            "Trip is already assigned to another brand.",

        "DISTRICT_MISMATCH":
            "Trip is already assigned to another district.",

        "FRESH_DAILY_TIME_BUDGET":
            "Vehicle would exceed the 270-minute Fresh daily budget.",

        "STYLE_TECH_DAILY_TIME_BUDGET":
            "Vehicle would exceed the 480-minute Style/Tech daily budget.",

        "DELIVERY_WINDOW_MISSED":
            "The outlet delivery window cannot be met.",

        "FRESH_8AM_DEADLINE":
            "Fresh delivery would arrive at or after 8:00 AM.",

        "TRAVEL_DATA_MISSING":
            "Required district/depot travel data is missing.",

        "OUTLET_NOT_FOUND":
            "The delivery outlet could not be found.",

        "SERVICE_ALLOWANCE_MISSING":
            "Required service allowance is missing.",

        "TRIP_ALREADY_CLOSED":
            "Trip 1 was already closed after Trip 2 started.",

        "TRIP_SEQUENCE_OVERLAP":
            "Trip 2 would start before Trip 1 has finished.",

        "WEEKLY_FUEL_QUOTA":
            "Vehicle would exceed its weekly fuel quota.",
    }

    if not reason_codes:
        return "No compatible assignment was found."

    explanations = [
        messages.get(
            code,
            f"Assignment constraint: {code}.",
        )
        for code in reason_codes
    ]

    return " ".join(
        dict.fromkeys(explanations)
    )


def calculate_priority(order, outlet):
    score = 0

    # ---------------------------------------------------------
    # Brand priority
    # ---------------------------------------------------------
    if order.brand == "Fresh":
        score += 50

    elif order.brand == "Tech":
        score += 30

    elif order.brand == "Style":
        score += 20

    # ---------------------------------------------------------
    # Chilled products get extra priority
    # ---------------------------------------------------------
    if order.temp_requirement == "chilled":
        score += 30

    # ---------------------------------------------------------
    # Restricted access gets slight priority
    # ---------------------------------------------------------
    if outlet.parking_constraint == "van_only":
        score += 10

    return score


def generate_plan(
    orders,
    outlets_by_id,
    vehicles,
    travel_by_key,
    service_allowances,
):
    assignments = []
    deferred = []

    vehicle_state = {}

    # =========================================================
    # Initialize vehicle state
    # =========================================================
    for vehicle in vehicles:
        vehicle_state[vehicle.vehicle_id] = {
            "fresh_minutes": 0,
            "style_tech_minutes": 0,

            # -------------------------------------------------
            # Fuel tracking
            # -------------------------------------------------
            "fuel_used_l": 0.0,
            "fuel_quota_l": (
                vehicle.weekly_fuel_quota_l
            ),

            "trips": {
                1: {
                    "weight": 0.0,
                    "volume": 0.0,
                    "orders": [],
                    "order_objects": [],
                    "brand": None,
                    "district": None,
                    "estimated_minutes": 0,

                    # Fuel / distance
                    "distance_km": 0.0,
                    "fuel_l": 0.0,

                    "schedule": [],
                    "trip_start": None,
                    "trip_end": None,
                },

                2: {
                    "weight": 0.0,
                    "volume": 0.0,
                    "orders": [],
                    "order_objects": [],
                    "brand": None,
                    "district": None,
                    "estimated_minutes": 0,

                    # Fuel / distance
                    "distance_km": 0.0,
                    "fuel_l": 0.0,

                    "schedule": [],
                    "trip_start": None,
                    "trip_end": None,
                },
            },
        }

    # =========================================================
    # Enrich orders with outlet + priority
    # =========================================================
    enriched_orders = []

    for order in orders:
        outlet = outlets_by_id.get(order.outlet_id)

        if not outlet:
            continue

        enriched_orders.append(
            {
                "order": order,
                "outlet": outlet,
                "priority": calculate_priority(
                    order,
                    outlet,
                ),
            }
        )

    # =========================================================
    # Highest priority orders first
    # =========================================================
    enriched_orders.sort(
        key=lambda x: x["priority"],
        reverse=True,
    )

    # =========================================================
    # Assign orders
    # =========================================================
    for item in enriched_orders:
        order = item["order"]
        outlet = item["outlet"]

        assigned = False
        failure_reasons = []

        # =====================================================
        # Try every vehicle
        # =====================================================
        for vehicle in vehicles:

            # =================================================
            # Try Trip 1 first, then Trip 2
            # =================================================
            for trip_number in [1, 2]:

                trip_state = vehicle_state[
                    vehicle.vehicle_id
                ]["trips"][trip_number]

                # =================================================
                # STEP 1
                # Sequential trip protection
                #
                # Once Trip 2 contains at least one order,
                # Trip 1 is permanently closed.
                # =================================================
                if trip_number == 1:

                    trip_two = vehicle_state[
                        vehicle.vehicle_id
                    ]["trips"][2]

                    if trip_two["orders"]:

                        failure_reasons.append(
                            "TRIP_ALREADY_CLOSED"
                        )

                        continue

                # =================================================
                # STEP 2
                # Same brand + same district per trip
                # =================================================
                if trip_state["orders"]:

                    if trip_state["brand"] != order.brand:

                        failure_reasons.append(
                            "BRAND_MISMATCH"
                        )

                        continue

                    if trip_state["district"] != order.district:

                        failure_reasons.append(
                            "DISTRICT_MISMATCH"
                        )

                        continue

                # =================================================
                # STEP 3
                # Validate order against vehicle capacity/rules
                # =================================================
                result = validate_order_for_vehicle(
                    order=order,
                    outlet=outlet,
                    vehicle=vehicle,
                    current_weight_kg=trip_state["weight"],
                    current_volume_m3=trip_state["volume"],
                )

                if not result["valid"]:

                    for reason in result["reasons"]:

                        failure_reasons.append(
                            reason["code"]
                        )

                    continue

                # =================================================
                # STEP 4
                # Travel data
                # =================================================
                travel_key = (
                    order.district,
                    order.depot,
                )

                travel = travel_by_key.get(
                    travel_key
                )

                if not travel:

                    failure_reasons.append(
                        "TRAVEL_DATA_MISSING"
                    )

                    continue

                # =================================================
                # STEP 5
                # Candidate orders
                #
                # Existing orders in this trip + new order
                # =================================================
                candidate_orders = (
                    trip_state["order_objects"]
                    + [order]
                )

                # =================================================
                # STEP 6
                # Calculate candidate trip time
                #
                # Waiting time is NOT included here.
                # =================================================
                candidate_minutes = calculate_trip_minutes(
                    orders=candidate_orders,
                    outlets_by_id=outlets_by_id,
                    travel=travel,
                    service_allowances=service_allowances,
                )

                # =================================================
                # STEP 7
                # Calculate additional minutes
                # =================================================
                old_trip_minutes = (
                    trip_state["estimated_minutes"]
                )

                additional_minutes = (
                    candidate_minutes
                    - old_trip_minutes
                )

                # Safety against unexpected negative values
                if additional_minutes < 0:
                    additional_minutes = 0

                # =================================================
                # STEP 8
                # Daily time budget
                # =================================================
                if order.brand == "Fresh":

                    projected_daily_minutes = (
                        vehicle_state[
                            vehicle.vehicle_id
                        ]["fresh_minutes"]
                        + additional_minutes
                    )

                    if projected_daily_minutes > 270:

                        failure_reasons.append(
                            "FRESH_DAILY_TIME_BUDGET"
                        )

                        continue

                else:

                    projected_daily_minutes = (
                        vehicle_state[
                            vehicle.vehicle_id
                        ]["style_tech_minutes"]
                        + additional_minutes
                    )

                    if projected_daily_minutes > 480:

                        failure_reasons.append(
                            "STYLE_TECH_DAILY_TIME_BUDGET"
                        )

                        continue

                # =================================================
                # STEP 9
                # Candidate distance + fuel
                #
                # IMPORTANT:
                # Calculate fuel using the COMPLETE candidate trip.
                #
                # Then only the incremental fuel is added to the
                # vehicle's accumulated fuel usage.
                # =================================================
                candidate_distance_km = (
                    calculate_trip_distance_km(
                        stop_count=len(
                            candidate_orders
                        ),
                        travel=travel,
                    )
                )

                candidate_fuel_l = (
                    calculate_fuel_litres(
                        distance_km=(
                            candidate_distance_km
                        ),
                        km_per_l=vehicle.km_per_l,
                    )
                )

                # -------------------------------------------------
                # Existing trip fuel
                # -------------------------------------------------
                old_trip_fuel_l = (
                    trip_state["fuel_l"]
                )

                # -------------------------------------------------
                # Only count the newly added fuel
                # -------------------------------------------------
                additional_fuel_l = (
                    candidate_fuel_l
                    - old_trip_fuel_l
                )

                # Safety against unexpected negative values
                if additional_fuel_l < 0:
                    additional_fuel_l = 0

                # -------------------------------------------------
                # Project vehicle's total fuel usage
                # -------------------------------------------------
                projected_fuel_l = (
                    vehicle_state[
                        vehicle.vehicle_id
                    ]["fuel_used_l"]
                    + additional_fuel_l
                )

                # -------------------------------------------------
                # Weekly fuel quota check
                # -------------------------------------------------
                if (
                    projected_fuel_l
                    > vehicle.weekly_fuel_quota_l
                ):

                    failure_reasons.append(
                        "WEEKLY_FUEL_QUOTA"
                    )

                    continue

                # =================================================
                # STEP 10
                # Sequential start time
                #
                # Trip 1:
                #     no forced earliest start
                #
                # Trip 2:
                #     must start AFTER Trip 1 ends
                # =================================================
                earliest_start = None

                if trip_number == 2:

                    trip_one = vehicle_state[
                        vehicle.vehicle_id
                    ]["trips"][1]

                    if trip_one["trip_end"]:

                        earliest_start = parse_time(
                            trip_one["trip_end"]
                        )

                # =================================================
                # STEP 11
                # Build actual schedule
                #
                # candidate_minutes is still competition duration.
                # Waiting time is handled by schedule calculator.
                # =================================================
                schedule_result = build_trip_schedule(
                    trip_orders=candidate_orders,
                    outlets_by_id=outlets_by_id,
                    travel=travel,
                    service_allowances=service_allowances,
                    earliest_start=earliest_start,
                )

                # =================================================
                # STEP 12
                # Validate schedule
                # =================================================
                if not schedule_result["valid"]:

                    for violation in schedule_result[
                        "violations"
                    ]:

                        code = violation.get("code")

                        if code:
                            failure_reasons.append(
                                code
                            )

                    continue

                # =================================================
                # STEP 13
                # Additional Trip 2 safety check
                # =================================================
                if trip_number == 2:

                    trip_one = vehicle_state[
                        vehicle.vehicle_id
                    ]["trips"][1]

                    if trip_one["trip_end"]:

                        trip_one_end = parse_time(
                            trip_one["trip_end"]
                        )

                        trip_two_start = parse_time(
                            schedule_result["trip_start"]
                        )

                        if trip_two_start < trip_one_end:

                            failure_reasons.append(
                                "TRIP_SEQUENCE_OVERLAP"
                            )

                            continue

                # =================================================
                # STEP 14
                # Successful assignment
                # =================================================

                # -------------------------------------------------
                # First order defines trip brand + district
                # -------------------------------------------------
                if not trip_state["orders"]:

                    trip_state["brand"] = (
                        order.brand
                    )

                    trip_state["district"] = (
                        order.district
                    )

                # -------------------------------------------------
                # Update daily time totals
                # -------------------------------------------------
                if order.brand == "Fresh":

                    vehicle_state[
                        vehicle.vehicle_id
                    ]["fresh_minutes"] += (
                        additional_minutes
                    )

                else:

                    vehicle_state[
                        vehicle.vehicle_id
                    ]["style_tech_minutes"] += (
                        additional_minutes
                    )

                # -------------------------------------------------
                # Update vehicle fuel total
                # -------------------------------------------------
                vehicle_state[
                    vehicle.vehicle_id
                ]["fuel_used_l"] += (
                    additional_fuel_l
                )

                # -------------------------------------------------
                # Update weight
                # -------------------------------------------------
                trip_state["weight"] = (
                    result["new_weight_kg"]
                )

                # -------------------------------------------------
                # Update volume
                # -------------------------------------------------
                trip_state["volume"] = (
                    result["new_volume_m3"]
                )

                # -------------------------------------------------
                # Add delivery ID
                # -------------------------------------------------
                trip_state["orders"].append(
                    order.delivery_id
                )

                # -------------------------------------------------
                # Keep SQLAlchemy order object internally
                # -------------------------------------------------
                trip_state[
                    "order_objects"
                ].append(
                    order
                )

                # -------------------------------------------------
                # Update estimated trip duration
                # -------------------------------------------------
                trip_state[
                    "estimated_minutes"
                ] = candidate_minutes

                # -------------------------------------------------
                # Update trip distance
                # -------------------------------------------------
                trip_state[
                    "distance_km"
                ] = candidate_distance_km

                # -------------------------------------------------
                # Update trip fuel
                # -------------------------------------------------
                trip_state[
                    "fuel_l"
                ] = candidate_fuel_l

                # -------------------------------------------------
                # Save actual schedule
                # -------------------------------------------------
                trip_state["schedule"] = (
                    schedule_result["stops"]
                )

                trip_state["trip_start"] = (
                    schedule_result["trip_start"]
                )

                trip_state["trip_end"] = (
                    schedule_result["trip_end"]
                )

                # =================================================
                # STEP 15
                # Find newly assigned order's stop
                # =================================================
                assigned_stop = None

                for stop in schedule_result["stops"]:

                    stop_delivery_id = stop.get(
                        "delivery_id"
                    )

                    if stop_delivery_id == (
                        order.delivery_id
                    ):

                        assigned_stop = stop
                        break

                # -------------------------------------------------
                # Fallback
                # -------------------------------------------------
                if assigned_stop is None:

                    assigned_stop = (
                        schedule_result["stops"][-1]
                    )

                # =================================================
                # STEP 16
                # Add assignment
                # =================================================
                assignments.append(
                    {
                        "delivery_id": (
                            order.delivery_id
                        ),

                        "outlet_id": (
                            order.outlet_id
                        ),

                        "brand": (
                            order.brand
                        ),

                        "district": (
                            order.district
                        ),

                        "temp_requirement": (
                            order.temp_requirement
                        ),

                        "vehicle_id": (
                            vehicle.vehicle_id
                        ),

                        "trip_number": (
                            trip_number
                        ),

                        "priority": (
                            item["priority"]
                        ),

                        "weight_kg": (
                            order.order_weight_kg
                        ),

                        "volume_m3": (
                            order.order_volume_m3
                        ),

                        "estimated_trip_minutes": (
                            candidate_minutes
                        ),

                        # -------------------------------------------------
                        # Fuel / distance information
                        # -------------------------------------------------
                        "trip_distance_km": (
                            candidate_distance_km
                        ),

                        "trip_fuel_l": (
                            candidate_fuel_l
                        ),

                        "arrival_time": (
                            assigned_stop[
                                "service_start"
                            ]
                        ),

                        "window_open": (
                            assigned_stop[
                                "window_open"
                            ]
                        ),

                        "window_close": (
                            assigned_stop[
                                "window_close"
                            ]
                        ),

                        "waiting_minutes": (
                            assigned_stop[
                                "waiting_minutes"
                            ]
                        ),

                        "window_valid": (
                            assigned_stop[
                                "window_valid"
                            ]
                        ),
                    }
                )

                # -------------------------------------------------
                # Mark assigned
                # -------------------------------------------------
                assigned = True

                break

            # =====================================================
            # Vehicle loop break
            # =====================================================
            if assigned:
                break

        # =========================================================
        # If order could not be assigned
        # =========================================================
        if not assigned:

            # -----------------------------------------------------
            # Remove duplicate reason codes
            # -----------------------------------------------------
            unique_reasons = list(
                dict.fromkeys(
                    failure_reasons
                )
            )

            # -----------------------------------------------------
            # Keep only the most useful reason codes
            # -----------------------------------------------------
            deferred_reasons = unique_reasons[:8]

            deferred.append(
                {
                    "delivery_id": (
                        order.delivery_id
                    ),

                    "outlet_id": (
                        order.outlet_id
                    ),

                    "brand": (
                        order.brand
                    ),

                    "district": (
                        order.district
                    ),

                    "priority": (
                        item["priority"]
                    ),

                    "reason_codes": (
                        deferred_reasons
                    ),

                    "explanation": (
                        build_deferral_explanation(
                            deferred_reasons
                        )
                    ),
                }
            )

    # =========================================================
    # Remove internal SQLAlchemy order objects
    # =========================================================
    for state in vehicle_state.values():

        for trip in state["trips"].values():

            trip.pop(
                "order_objects",
                None,
            )

    # =========================================================
    # Return generated plan
    # =========================================================
    return {
        "assignments": assignments,
        "deferred": deferred,
        "vehicle_state": vehicle_state,
    }