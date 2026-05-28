# backend/apps/ingestion/parsers/utility.py

"""
Utility electricity CSV parser.

Utility portals (e.g. National Grid, local utilities) export billing data
with overlapping billing periods. A bill from Jan 15 to Feb 14 doesn't
align to a calendar month — this is normal and we preserve the raw dates.

Fields we expect but handle gracefully if missing:
- tariff_type (may be blank for simple meters)
- facility (may be a meter ID only)
"""

import pandas as pd
import io
from typing import Any

COLUMN_MAP = {
    "meter_id": "meter_id",
    "meterid": "meter_id",
    "meter": "meter_id",
    "account_number": "meter_id",
    "billing_start": "billing_start",
    "start_date": "billing_start",
    "period_start": "billing_start",
    "from": "billing_start",
    "billing_end": "billing_end",
    "end_date": "billing_end",
    "period_end": "billing_end",
    "to": "billing_end",
    "kwh_usage": "kwh_usage",
    "kwh": "kwh_usage",
    "consumption": "kwh_usage",
    "units_used": "kwh_usage",
    "usage_kwh": "kwh_usage",
    "tariff_type": "tariff_type",
    "tariff": "tariff_type",
    "rate_type": "tariff_type",
    "facility": "facility",
    "site": "facility",
    "location": "facility",
    "building": "facility",
}


def parse_utility_csv(file_bytes: bytes) -> list[dict[str, Any]]:
    try:
        df = pd.read_csv(io.BytesIO(file_bytes), dtype=str)
    except UnicodeDecodeError:
        df = pd.read_csv(io.BytesIO(file_bytes), dtype=str, encoding="latin-1")

    df.columns = [c.lower().strip().replace(" ", "_") for c in df.columns]
    rename = {col: COLUMN_MAP[col] for col in df.columns if col in COLUMN_MAP}
    df = df.rename(columns=rename)

    required = ["meter_id", "billing_start", "billing_end", "kwh_usage"]
    missing = [r for r in required if r not in df.columns]
    if missing:
        raise ValueError(f"Utility CSV missing columns: {missing}")

    df = df.where(df.notna(), None)
    return df.to_dict(orient="records")