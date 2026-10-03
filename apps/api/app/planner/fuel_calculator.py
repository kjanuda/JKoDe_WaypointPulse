def calculate_trip_distance_km(
    stop_count: int,
    travel,
):
    """
    Approximate trip distance using shared
    district travel reference data.

    outbound:
        depot -> district

    between stops:
        inter_stop_km * (n - 1)

    return:
        district -> depot

    For fuel usage we count the return journey.
    """

    if stop_count <= 0:
        return 0.0

    outbound_km = float(
        travel.depot_to_district_km
    )

    inter_stop_km = (
        float(travel.inter_stop_km)
        * max(stop_count - 1, 0)
    )

    return_km = outbound_km

    return round(
        outbound_km
        + inter_stop_km
        + return_km,
        2,
    )


def calculate_fuel_litres(
    distance_km: float,
    km_per_l: float,
):
    if km_per_l <= 0:
        raise ValueError(
            "Vehicle km_per_l must be > 0"
        )

    return round(
        distance_km / km_per_l,
        3,
    )