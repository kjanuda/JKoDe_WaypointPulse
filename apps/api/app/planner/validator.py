from typing import Dict, Any


def validate_order_for_vehicle(
    order,
    outlet,
    vehicle,
    current_weight_kg: float = 0.0,
    current_volume_m3: float = 0.0,
) -> Dict[str, Any]:

    reasons = []

    # 1. Depot constraint
    if vehicle.depot != order.depot:
        reasons.append({
            "code": "DEPOT_MISMATCH",
            "message": (
                f"Vehicle belongs to {vehicle.depot}, "
                f"but order belongs to {order.depot}."
            ),
        })

    # 2. Refrigeration constraint
    if (
        order.temp_requirement == "chilled"
        and vehicle.temp != "reefer"
    ):
        reasons.append({
            "code": "REEFER_REQUIRED",
            "message": (
                "Chilled order requires a refrigerated vehicle."
            ),
        })

    # 3. Van-only access
    if (
        outlet.parking_constraint == "van_only"
        and vehicle.type != "van"
    ):
        reasons.append({
            "code": "VAN_REQUIRED",
            "message": (
                "Outlet is van-only and cannot be served by a truck."
            ),
        })

    # 4. Weight capacity
    new_weight = (
        current_weight_kg
        + order.order_weight_kg
    )

    if new_weight > vehicle.weight_cap_kg:
        reasons.append({
            "code": "WEIGHT_CAPACITY",
            "message": (
                f"Weight would become {new_weight:.1f} kg, "
                f"above vehicle capacity "
                f"{vehicle.weight_cap_kg:.1f} kg."
            ),
        })

    # 5. Volume capacity
    new_volume = (
        current_volume_m3
        + order.order_volume_m3
    )

    if new_volume > vehicle.volume_cap_m3:
        reasons.append({
            "code": "VOLUME_CAPACITY",
            "message": (
                f"Volume would become {new_volume:.2f} m³, "
                f"above vehicle capacity "
                f"{vehicle.volume_cap_m3:.2f} m³."
            ),
        })

    return {
        "valid": len(reasons) == 0,
        "reasons": reasons,
        "new_weight_kg": new_weight,
        "new_volume_m3": new_volume,
    }