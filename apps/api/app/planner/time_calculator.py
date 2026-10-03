def calculate_trip_minutes(
    orders,
    outlets_by_id,
    travel,
    service_allowances,
):
    """
    Calculate estimated trip duration in minutes.

    Formula:
        depot-to-district travel
        + inter-stop travel
        + service allowance for each stop
    """

    if not orders:
        return 0

    # Travel from depot to the district
    outbound = travel.depot_to_district_freeflow_min

    # Travel between consecutive stops
    inter_stop = (
        travel.inter_stop_freeflow_min
        * max(len(orders) - 1, 0)
    )

    # Service/handling time at each outlet
    handling = 0

    for order in orders:
        outlet = outlets_by_id.get(order.outlet_id)

        if not outlet:
            raise ValueError(
                f"Outlet not found for order {order.order_id}: "
                f"{order.outlet_id}"
            )

        key = (
            order.brand,
            outlet.dock_type,
        )

        allowance = service_allowances.get(key)

        if allowance is None:
            raise ValueError(
                f"No service allowance for {key}"
            )

        handling += allowance

    return outbound + inter_stop + handling