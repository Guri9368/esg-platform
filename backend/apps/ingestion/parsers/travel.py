# backend/apps/ingestion/parsers/travel.py

"""
Corporate travel ingestion from API payload (Concur/Navan style).

We receive a JSON payload rather than CSV because travel platforms
have established REST APIs. We don't integrate with the real API —
we accept the same payload structure that Concur would send.

Airport code → distance is approximated using a static lookup table
for the most common corporate routes. A production system would use
the OAG or Great Circle Mapper API.
"""

from typing import Any

# Approximate great-circle distances in km for common airport pairs.
# In production: call an aviation distance API or use geopy with IATA coords.
AIRPORT_DISTANCES: dict[tuple[str, str], float] = {
    ("LHR", "JFK"): 5540,
    ("JFK", "LHR"): 5540,
    ("LHR", "SIN"): 10840,
    ("SIN", "LHR"): 10840,
    ("JFK", "LAX"): 3983,
    ("LAX", "JFK"): 3983,
    ("LHR", "CDG"): 341,
    ("CDG", "LHR"): 341,
    ("FRA", "JFK"): 6200,
    ("JFK", "FRA"): 6200,
    ("LHR", "DXB"): 5475,
    ("DXB", "LHR"): 5475,
    ("SIN", "HKG"): 2574,
    ("HKG", "SIN"): 2574,
    ("LHR", "BOM"): 7190,
    ("BOM", "LHR"): 7190,
    ("ORD", "LHR"): 6340,
    ("LHR", "ORD"): 6340,
}

KNOWN_AIRPORTS = {
    "LHR", "JFK", "LAX", "CDG", "FRA", "SIN", "DXB", "HKG",
    "BOM", "ORD", "SFO", "NRT", "PEK", "AMS", "MUC", "ZRH",
    "EWR", "BOS", "SEA", "ATL", "DFW", "IAH", "MIA", "YYZ",
}


def get_flight_distance(origin: str, destination: str) -> float | None:
    key = (origin.upper(), destination.upper())
    if key in AIRPORT_DISTANCES:
        return AIRPORT_DISTANCES[key]
    # Reverse lookup
    rev = (destination.upper(), origin.upper())
    if rev in AIRPORT_DISTANCES:
        return AIRPORT_DISTANCES[rev]
    return None


def parse_travel_record(record: dict[str, Any]) -> dict[str, Any]:
    """
    Parse and enrich a single travel record from the API payload.
    Returns structured record with distance and validation flags.
    """
    origin = (record.get("origin_airport") or "").upper().strip()
    destination = (record.get("destination_airport") or "").upper().strip()
    mode = (record.get("travel_mode") or "").lower().strip()

    flags = []

    if mode == "flight":
        if origin not in KNOWN_AIRPORTS:
            flags.append("unknown_origin_airport")
        if destination not in KNOWN_AIRPORTS:
            flags.append("unknown_destination_airport")

        distance_km = get_flight_distance(origin, destination)
        if distance_km is None and origin and destination:
            flags.append("flight_distance_not_found")
        record["distance_km"] = distance_km
    else:
        record["distance_km"] = record.get("taxi_distance")
        origin = None
        destination = None

    record["origin_airport"] = origin or None
    record["destination_airport"] = destination or None
    record["_parse_flags"] = flags
    return record