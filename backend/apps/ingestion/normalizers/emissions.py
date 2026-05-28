# backend/apps/ingestion/normalizers/emissions.py

"""
Emission factor lookup and CO2e calculation.

Factors sourced from DEFRA UK Government GHG Conversion Factors 2023.
We look up by category + unit and apply kg_co2e_per_unit.

This is intentionally simple — no AR5 vs AR6 GWP switching,
no country-specific electricity grid factors per region.
Those would require more data infrastructure than this scope warrants.
"""

from decimal import Decimal
from apps.ingestion.models import EmissionFactor


def calculate_co2e(
    category: str,
    quantity: float,
    unit: str,
    reference_date=None,
) -> tuple[Decimal | None, EmissionFactor | None]:
    """
    Returns (kg_co2e, emission_factor_record) or (None, None) if no factor found.
    """
    qs = EmissionFactor.objects.filter(category=category, unit=unit)
    if reference_date:
        qs = qs.filter(valid_from__lte=reference_date).filter(
            valid_to__isnull=True
        ) | qs.filter(
            valid_from__lte=reference_date, valid_to__gte=reference_date
        )
    factor = qs.order_by("-valid_from").first()

    if not factor:
        return None, None

    return Decimal(str(quantity)) * factor.kg_co2e_per_unit, factor