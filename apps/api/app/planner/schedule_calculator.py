from datetime import datetime, timedelta


TIME_FMT = "%H:%M"


def parse_time(value: str):
    return datetime.strptime(
        value.strip(),
        TIME_FMT,
    )


def minutes_between(start, end):
    return int(
        (end - start).total_seconds() / 60
    )


def parse_mall_window(value):
    """
    Supports examples such as:

    06:00-09:00
    06:00 – 09:00
    06:00 to 09:00
    """

    if not value:
        return None

    cleaned = (
        value.strip()
        .replace("–", "-")
        .replace("—", "-")
        .replace(" to ", "-")
    )

    parts = cleaned.split("-")

    if len(parts) != 2:
        return None

    try:
        return (
            parse_time(parts[0]),
            parse_time(parts[1]),
        )
    except ValueError:
        return None


def get_effective_window(
    order,
    outlet,
):
    """
    Returns effective open/close window.

    Normal outlet:
        order window

    Mall outlet:
        intersection of order window
        and mall access window
    """

    open_time = parse_time(
        order.window_open_time
    )

    close_time = parse_time(
        order.window_close_time
    )

    if (
        outlet.parking_constraint
        == "mall_dock"
        and outlet.mall_window
    ):
        mall_window = parse_mall_window(
            outlet.mall_window
        )

        if mall_window:
            mall_open, mall_close = (
                mall_window
            )

            open_time = max(
                open_time,
                mall_open,
            )

            close_time = min(
                close_time,
                mall_close,
            )

    return open_time, close_time


def get_trip_start_time(
    trip_orders,
    outlets_by_id,
):
    """
    Fresh:
        fixed operating start = 03:30

    Style / Tech:
        Use earliest effective outlet
        opening window for feasibility
        scheduling.
    """

    if not trip_orders:
        return parse_time("03:30")

    brand = trip_orders[0].brand

    if brand == "Fresh":
        return parse_time("03:30")

    openings = []

    for order in trip_orders:
        outlet = outlets_by_id[
            order.outlet_id
        ]

        open_time, _ = (
            get_effective_window(
                order,
                outlet,
            )
        )

        openings.append(
            open_time
        )

    return min(openings)


def build_trip_schedule(
    trip_orders,
    outlets_by_id,
    travel,
    service_allowances,
    earliest_start=None,
):
    if not trip_orders:
        return {
            "valid": True,
            "trip_start": None,
            "trip_end": None,
            "stops": [],
            "violations": [],
        }

    # =========================================================
    # Determine trip start
    # =========================================================
    default_start = get_trip_start_time(
        trip_orders,
        outlets_by_id,
    )

    if earliest_start is not None:
        current_time = max(
            default_start,
            earliest_start,
        )
    else:
        current_time = default_start

    trip_start = current_time

    # =========================================================
    # Depot -> district
    # =========================================================
    current_time += timedelta(
        minutes=(
            travel
            .depot_to_district_freeflow_min
        )
    )

    stops = []
    violations = []

    # =========================================================
    # Process each delivery
    # =========================================================
    for index, order in enumerate(
        trip_orders
    ):
        outlet = outlets_by_id.get(
            order.outlet_id
        )

        if not outlet:
            violations.append(
                {
                    "delivery_id":
                        order.delivery_id,
                    "code":
                        "OUTLET_NOT_FOUND",
                }
            )

            continue

        # =====================================================
        # Between stops
        # =====================================================
        if index > 0:
            current_time += timedelta(
                minutes=(
                    travel
                    .inter_stop_freeflow_min
                )
            )

        # =====================================================
        # Effective delivery window
        # =====================================================
        window_open, window_close = (
            get_effective_window(
                order,
                outlet,
            )
        )

        # Keep actual arrival before any waiting.
        raw_arrival = current_time

        waiting_minutes = 0

        # =====================================================
        # Arrived early -> wait until outlet opens
        # =====================================================
        if current_time < window_open:

            waiting_minutes = (
                minutes_between(
                    current_time,
                    window_open,
                )
            )

            current_time = window_open

        # =====================================================
        # Actual service start
        # =====================================================
        service_start = current_time

        valid = True
        reason = None

        # =====================================================
        # 1. Outlet delivery window check
        #
        # This checks whether the service starts after the
        # outlet's effective closing time.
        # =====================================================
        if service_start > window_close:

            valid = False

            reason = (
                "DELIVERY_WINDOW_MISSED"
            )

        # =====================================================
        # 2. Fresh strict 08:00 AM deadline
        #
        # IMPORTANT:
        #
        # Fresh must START service BEFORE 08:00.
        #
        # Therefore:
        #
        # 07:59 -> valid
        # 08:00 -> INVALID
        # 08:01 -> INVALID
        #
        # The >= comparison is intentional.
        # =====================================================
        fresh_deadline = parse_time(
            "08:00"
        )

        if (
            order.brand == "Fresh"
            and service_start
            >= fresh_deadline
        ):
            valid = False

            reason = (
                "FRESH_8AM_DEADLINE"
            )

        # =====================================================
        # 3. Service allowance
        # =====================================================
        key = (
            order.brand,
            outlet.dock_type,
        )

        service_minutes = (
            service_allowances.get(key)
        )

        if service_minutes is None:

            violations.append(
                {
                    "delivery_id":
                        order.delivery_id,
                    "code":
                        "SERVICE_ALLOWANCE_MISSING",
                }
            )

            service_minutes = 0

            valid = False

            reason = (
                "SERVICE_ALLOWANCE_MISSING"
            )

        # =====================================================
        # Calculate service end
        # =====================================================
        service_end = (
            service_start
            + timedelta(
                minutes=service_minutes
            )
        )

        # =====================================================
        # Save stop
        # =====================================================
        stops.append(
            {
                "sequence":
                    index + 1,

                "delivery_id":
                    order.delivery_id,

                "outlet_id":
                    order.outlet_id,

                "arrival_time":
                    raw_arrival.strftime(
                        TIME_FMT
                    ),

                "service_start":
                    service_start.strftime(
                        TIME_FMT
                    ),

                "service_end":
                    service_end.strftime(
                        TIME_FMT
                    ),

                "window_open":
                    window_open.strftime(
                        TIME_FMT
                    ),

                "window_close":
                    window_close.strftime(
                        TIME_FMT
                    ),

                "waiting_minutes":
                    waiting_minutes,

                "service_minutes":
                    service_minutes,

                "window_valid":
                    valid,

                "reason":
                    reason,
            }
        )

        # =====================================================
        # Add violation
        # =====================================================
        if not valid:

            violations.append(
                {
                    "delivery_id":
                        order.delivery_id,

                    "outlet_id":
                        order.outlet_id,

                    "code":
                        reason,

                    "arrival_time":
                        service_start.strftime(
                            TIME_FMT
                        ),

                    "window_close":
                        window_close.strftime(
                            TIME_FMT
                        ),
                }
            )

        # =====================================================
        # Move current time to end of service
        # =====================================================
        current_time = service_end

    # =========================================================
    # Final result
    # =========================================================
    return {
        "valid":
            len(violations) == 0,

        "trip_start":
            trip_start.strftime(
                TIME_FMT
            ),

        "trip_end":
            current_time.strftime(
                TIME_FMT
            ),

        "stops":
            stops,

        "violations":
            violations,
    }