# backend/apps/ingestion/parsers/sap.py

"""
SAP flat-file CSV parser.

Real SAP exports are messy:
- Column headers in German (Menge = Quantity, Einheit = Unit, Werk = Plant)
- Mixed date formats from different plant locales
- Inconsistent fuel type naming
- Sometimes plant code missing or 'N/A'

We handle this here in parsing, not in normalization.
Normalization assumes clean-ish field names; parsing does the dirty column mapping.
"""

import pandas as pd
import io
from typing import Any

# SAP exports vary by client config. These cover the most common column name variants.
COLUMN_MAP = {
    # German → English
    "werk": "plant_code",
    "plant": "plant_code",
    "plant_code": "plant_code",
    "kraftstoffart": "fuel_type",
    "fuel_type": "fuel_type",
    "kraftstoff": "fuel_type",
    "menge": "quantity",
    "quantity": "quantity",
    "einheit": "unit",
    "unit": "unit",
    "einh": "unit",
    "lieferant": "supplier",
    "supplier": "supplier",
    "vendor": "supplier",
    "rechnungsdatum": "invoice_date",
    "invoice_date": "invoice_date",
    "buchungsdatum": "invoice_date",
    "posting_date": "invoice_date",
    "belegdatum": "invoice_date",
    "material": "fuel_type",
    "cost_center": "cost_center",
    "kostenstelle": "cost_center",
}

FUEL_TYPE_MAP = {
    "diesel": "diesel",
    "dieselkraftstoff": "diesel",
    "hsd": "diesel",
    "petrol": "petrol",
    "benzin": "petrol",
    "gasoline": "petrol",
    "natural gas": "natural_gas",
    "erdgas": "natural_gas",
    "cng": "natural_gas",
    "lpg": "lpg",
    "fluessiggas": "lpg",
    "heavy fuel oil": "heavy_fuel_oil",
    "hfo": "heavy_fuel_oil",
    "schweroil": "heavy_fuel_oil",
    "kerosene": "kerosene",
    "kerosin": "kerosene",
    "jet fuel": "kerosene",
}


def parse_sap_csv(file_bytes: bytes) -> list[dict[str, Any]]:
    try:
        df = pd.read_csv(io.BytesIO(file_bytes), dtype=str, encoding="utf-8")
    except UnicodeDecodeError:
        df = pd.read_csv(io.BytesIO(file_bytes), dtype=str, encoding="latin-1")

    # Normalize column names: lowercase, strip, replace spaces
    df.columns = [c.lower().strip().replace(" ", "_").replace("-", "_") for c in df.columns]

    # Map whatever columns exist to our canonical names
    rename = {col: COLUMN_MAP[col] for col in df.columns if col in COLUMN_MAP}
    df = df.rename(columns=rename)

    required = ["plant_code", "fuel_type", "quantity", "unit", "invoice_date"]
    missing = [r for r in required if r not in df.columns]
    if missing:
        raise ValueError(f"SAP CSV missing required columns after mapping: {missing}")

    df = df.where(df.notna(), None)
    records = df.to_dict(orient="records")

    # Clean fuel type values
    for rec in records:
        raw_fuel = (rec.get("fuel_type") or "").lower().strip()
        rec["fuel_type_normalized"] = FUEL_TYPE_MAP.get(raw_fuel, None)

    return records