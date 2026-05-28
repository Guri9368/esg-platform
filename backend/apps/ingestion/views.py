# backend/apps/ingestion/views.py

import json
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, JSONParser

from apps.tenants.utils import get_tenant
from apps.audit.utils import log_change
from .models import DataSource, RawRecord, NormalizedEmissionRecord, PlantMapping
from .parsers.sap import parse_sap_csv
from .parsers.utility import parse_utility_csv
from .parsers.travel import parse_travel_record, KNOWN_AIRPORTS
from .normalizers.units import normalize_volume, normalize_electricity, normalize_distance
from .normalizers.dates import parse_date
from .normalizers.emissions import calculate_co2e
from .serializers import DataSourceSerializer, NormalizedRecordListSerializer


class SAPUploadView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        if "file" not in request.FILES:
            return Response({"error": "No file uploaded."}, status=400)

        tenant = get_tenant(request)
        file = request.FILES["file"]
        file_bytes = file.read()

        try:
            rows = parse_sap_csv(file_bytes)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

        with transaction.atomic():
            source = DataSource.objects.create(
                tenant=tenant,
                source_type=DataSource.SourceType.SAP,
                scope=DataSource.EmissionScope.SCOPE1,
                uploaded_by=request.user,
                raw_payload={"rows": rows},
                filename=file.name,
                row_count=len(rows),
            )
            normalized_records = []
            for idx, row in enumerate(rows):
                raw = RawRecord.objects.create(
                    source=source,
                    tenant=tenant,
                    row_index=idx,
                    raw_data=row,
                )
                normalized = _normalize_sap_row(raw, row, tenant)
                normalized_records.append(normalized)

            NormalizedEmissionRecord.objects.bulk_create(normalized_records)

        return Response(
            {"source_id": str(source.id), "rows_ingested": len(rows)},
            status=status.HTTP_201_CREATED,
        )


def _normalize_sap_row(raw: RawRecord, row: dict, tenant) -> NormalizedEmissionRecord:
    flags = []
    plant_code = (row.get("plant_code") or "").strip()
    fuel_type = row.get("fuel_type_normalized")
    raw_quantity = row.get("quantity")
    raw_unit = (row.get("unit") or "").strip()
    invoice_date = parse_date(row.get("invoice_date") or "")

    if not plant_code or plant_code.upper() in ("", "N/A", "UNKNOWN"):
        flags.append("missing_plant_code")
    else:
        if not PlantMapping.objects.filter(tenant=tenant, plant_code=plant_code).exists():
            flags.append("unmapped_plant_code")

    if not fuel_type:
        flags.append("unknown_fuel_type")
        fuel_type = "unknown"

    quantity_norm, unit_norm = None, None
    if raw_quantity:
        try:
            q = float(str(raw_quantity).replace(",", "."))
            quantity_norm, unit_norm = normalize_volume(q, raw_unit)
            if quantity_norm is None:
                flags.append("unknown_unit")
        except (ValueError, TypeError):
            flags.append("invalid_quantity")

    if invoice_date is None:
        flags.append("unparseable_date")

    kg_co2e, ef = None, None
    if quantity_norm and unit_norm and fuel_type != "unknown":
        kg_co2e, ef = calculate_co2e(fuel_type, quantity_norm, unit_norm, invoice_date)
        if kg_co2e is None:
            flags.append("no_emission_factor")

    record_status = (
        NormalizedEmissionRecord.Status.WARNING if flags
        else NormalizedEmissionRecord.Status.PENDING
    )

    return NormalizedEmissionRecord(
        raw_record=raw,
        tenant=tenant,
        source=raw.source,
        emission_scope=DataSource.EmissionScope.SCOPE1,
        category=fuel_type,
        quantity_normalized=Decimal(str(quantity_norm)) if quantity_norm else None,
        unit_normalized=unit_norm or "",
        emission_factor=ef,
        kg_co2e=kg_co2e,
        status=record_status,
        warning_flags=flags,
        period_start=invoice_date,
        period_end=invoice_date,
        structured_data={
            "plant_code": plant_code,
            "supplier": row.get("supplier"),
            "cost_center": row.get("cost_center"),
        },
    )


class UtilityUploadView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        if "file" not in request.FILES:
            return Response({"error": "No file uploaded."}, status=400)

        tenant = get_tenant(request)
        file = request.FILES["file"]
        file_bytes = file.read()

        try:
            rows = parse_utility_csv(file_bytes)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

        with transaction.atomic():
            source = DataSource.objects.create(
                tenant=tenant,
                source_type=DataSource.SourceType.UTILITY,
                scope=DataSource.EmissionScope.SCOPE2,
                uploaded_by=request.user,
                raw_payload={"rows": rows},
                filename=file.name,
                row_count=len(rows),
            )
            normalized_records = []
            for idx, row in enumerate(rows):
                raw = RawRecord.objects.create(
                    source=source,
                    tenant=tenant,
                    row_index=idx,
                    raw_data=row,
                )
                normalized_records.append(_normalize_utility_row(raw, row, tenant))

            NormalizedEmissionRecord.objects.bulk_create(normalized_records)

        return Response({"source_id": str(source.id), "rows_ingested": len(rows)}, status=201)


def _normalize_utility_row(raw: RawRecord, row: dict, tenant) -> NormalizedEmissionRecord:
    flags = []
    meter_id = (row.get("meter_id") or "").strip()
    facility = row.get("facility") or meter_id
    raw_kwh = row.get("kwh_usage")
    billing_start = parse_date(row.get("billing_start") or "")
    billing_end = parse_date(row.get("billing_end") or "")

    if not meter_id:
        flags.append("missing_meter_id")

    if billing_start is None:
        flags.append("unparseable_billing_start")
    if billing_end is None:
        flags.append("unparseable_billing_end")

    quantity_norm = None
    try:
        q = float(str(raw_kwh).replace(",", "")) if raw_kwh else None
        if q is not None:
            quantity_norm = q
            # Flag abnormal spikes: >500,000 kWh per billing period is unusual for most facilities
            if q > 500_000:
                flags.append("abnormal_high_usage")
            if q < 0:
                flags.append("negative_usage")
    except (ValueError, TypeError):
        flags.append("invalid_kwh_value")

    kg_co2e, ef = None, None
    if quantity_norm:
        kg_co2e, ef = calculate_co2e("electricity_uk", quantity_norm, "kwh", billing_start)
        if kg_co2e is None:
            flags.append("no_emission_factor")

    record_status = (
        NormalizedEmissionRecord.Status.WARNING if flags
        else NormalizedEmissionRecord.Status.PENDING
    )

    return NormalizedEmissionRecord(
        raw_record=raw,
        tenant=tenant,
        source=raw.source,
        emission_scope=DataSource.EmissionScope.SCOPE2,
        category="electricity",
        quantity_normalized=Decimal(str(quantity_norm)) if quantity_norm else None,
        unit_normalized="kwh",
        emission_factor=ef,
        kg_co2e=kg_co2e,
        status=record_status,
        warning_flags=flags,
        period_start=billing_start,
        period_end=billing_end,
        structured_data={
            "meter_id": meter_id,
            "facility": facility,
            "tariff_type": row.get("tariff_type"),
        },
    )


class TravelImportView(APIView):
    parser_classes = [JSONParser]

    def post(self, request):
        records = request.data if isinstance(request.data, list) else request.data.get("records", [])
        if not records:
            return Response({"error": "No travel records provided."}, status=400)

        tenant = get_tenant(request)

        with transaction.atomic():
            source = DataSource.objects.create(
                tenant=tenant,
                source_type=DataSource.SourceType.TRAVEL,
                scope=DataSource.EmissionScope.SCOPE3,
                uploaded_by=request.user,
                raw_payload={"records": records},
                filename="travel_api_import",
                row_count=len(records),
            )

            normalized_records = []
            for idx, record in enumerate(records):
                parsed = parse_travel_record(dict(record))
                raw = RawRecord.objects.create(
                    source=source,
                    tenant=tenant,
                    row_index=idx,
                    raw_data=parsed,
                )
                normalized_records.append(_normalize_travel_record(raw, parsed, tenant))

            NormalizedEmissionRecord.objects.bulk_create(normalized_records)

        return Response({"source_id": str(source.id), "rows_ingested": len(records)}, status=201)


def _normalize_travel_record(raw: RawRecord, record: dict, tenant) -> NormalizedEmissionRecord:
    flags = list(record.get("_parse_flags", []))
    mode = (record.get("travel_mode") or "").lower().strip()
    distance_km = record.get("distance_km")
    hotel_nights = record.get("hotel_nights")

    category_map = {
        "flight": "flight",
        "taxi": "taxi",
        "car": "car",
        "train": "train",
        "bus": "bus",
    }
    category = category_map.get(mode, "unknown_transport")
    if category == "unknown_transport":
        flags.append("unknown_travel_mode")

    quantity_norm, kg_co2e, ef = None, None, None

    if mode == "flight" and distance_km:
        quantity_norm = distance_km
        kg_co2e, ef = calculate_co2e("flight", distance_km, "km")
        if kg_co2e is None:
            flags.append("no_emission_factor")
    elif mode in ("taxi", "car") and distance_km:
        try:
            d = float(distance_km)
            quantity_norm = d
            kg_co2e, ef = calculate_co2e(mode, d, "km")
        except (ValueError, TypeError):
            flags.append("invalid_distance")

    hotel_co2e = Decimal("0")
    if hotel_nights:
        try:
            nights = int(hotel_nights)
            if nights > 0:
                h_co2e, _ = calculate_co2e("hotel_stay", nights, "night")
                hotel_co2e = h_co2e or Decimal("0")
        except (ValueError, TypeError):
            flags.append("invalid_hotel_nights")

    total_co2e = (kg_co2e or Decimal("0")) + hotel_co2e

    record_status = (
        NormalizedEmissionRecord.Status.WARNING if flags
        else NormalizedEmissionRecord.Status.PENDING
    )

    return NormalizedEmissionRecord(
        raw_record=raw,
        tenant=tenant,
        source=raw.source,
        emission_scope=DataSource.EmissionScope.SCOPE3,
        category=category,
        quantity_normalized=Decimal(str(quantity_norm)) if quantity_norm else None,
        unit_normalized="km" if mode == "flight" else ("km" if distance_km else ""),
        emission_factor=ef,
        kg_co2e=total_co2e if total_co2e > 0 else None,
        status=record_status,
        warning_flags=flags,
        period_start=None,
        period_end=None,
        structured_data={
            "employee_name": record.get("employee_name"),
            "origin_airport": record.get("origin_airport"),
            "destination_airport": record.get("destination_airport"),
            "travel_mode": mode,
            "hotel_nights": hotel_nights,
            "distance_km": distance_km,
        },
    )