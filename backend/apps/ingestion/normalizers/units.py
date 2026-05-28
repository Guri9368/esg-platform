# backend/apps/ingestion/normalizers/units.py

"""
Unit normalization for fuel quantities and electricity.

We map everything to a canonical unit per category:
- Fuel volume → liters
- Electricity → kWh
- Distance → km

Decision: we use liters not kL or gallons as canonical because
DEFRA emission factors are published per liter for most fuel types.
"""

VOLUME_TO_LITERS = {
    "l": 1.0,
    "liter": 1.0,
    "liters": 1.0,
    "litre": 1.0,
    "litres": 1.0,
    "ltr": 1.0,
    "kl": 1000.0,
    "kiloliter": 1000.0,
    "kilolitre": 1000.0,
    "ml": 0.001,
    "gallon": 3.78541,
    "gallons": 3.78541,
    "gal": 3.78541,
    "usgal": 3.78541,
    "ukgal": 4.54609,
    "m3": 1000.0,
}

ELECTRICITY_TO_KWH = {
    "kwh": 1.0,
    "kw/h": 1.0,
    "kilowatt-hour": 1.0,
    "kilowatthour": 1.0,
    "mwh": 1000.0,
    "megawatthour": 1000.0,
    "gwh": 1_000_000.0,
}

DISTANCE_TO_KM = {
    "km": 1.0,
    "kilometer": 1.0,
    "kilometres": 1.0,
    "mi": 1.60934,
    "mile": 1.60934,
    "miles": 1.60934,
}


def normalize_volume(quantity: float, unit: str) -> tuple[float | None, str | None]:
    key = unit.strip().lower().replace(" ", "")
    factor = VOLUME_TO_LITERS.get(key)
    if factor is None:
        return None, None
    return round(quantity * factor, 4), "liters"


def normalize_electricity(quantity: float, unit: str) -> tuple[float | None, str | None]:
    key = unit.strip().lower().replace(" ", "").replace("-", "")
    factor = ELECTRICITY_TO_KWH.get(key)
    if factor is None:
        return None, None
    return round(quantity * factor, 4), "kwh"


def normalize_distance(quantity: float, unit: str) -> tuple[float | None, str | None]:
    key = unit.strip().lower()
    factor = DISTANCE_TO_KM.get(key)
    if factor is None:
        return None, None
    return round(quantity * factor, 4), "km"