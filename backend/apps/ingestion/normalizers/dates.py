# backend/apps/ingestion/normalizers/dates.py

"""
Date normalization handles the mess of real export formats.

SAP exports commonly use DD.MM.YYYY (German locale).
Utility portals often export MM/DD/YYYY or YYYY-MM-DD.
We attempt parsing in priority order, fallback to None with a flag.
"""

from datetime import date
from typing import Optional


_FORMATS = [
    "%d.%m.%Y",    # SAP German: 15.03.2023
    "%Y-%m-%d",    # ISO: 2023-03-15
    "%m/%d/%Y",    # US: 03/15/2023
    "%d/%m/%Y",    # UK: 15/03/2023
    "%d-%m-%Y",
    "%Y%m%d",      # Compact: 20230315
    "%d.%m.%y",    # Short year German
    "%m-%d-%Y",
]


def parse_date(value: str) -> Optional[date]:
    if not value or not isinstance(value, str):
        return None
    value = value.strip()
    for fmt in _FORMATS:
        try:
            from datetime import datetime
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None