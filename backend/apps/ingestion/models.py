# backend/apps/ingestion/models.py

import uuid
from django.db import models
from apps.tenants.models import Tenant
from apps.accounts.models import User


class DataSource(models.Model):
    class SourceType(models.TextChoices):
        SAP = "sap", "SAP Fuel & Procurement"
        UTILITY = "utility", "Utility Electricity"
        TRAVEL = "travel", "Corporate Travel"

    class EmissionScope(models.TextChoices):
        SCOPE1 = "scope1", "Scope 1"
        SCOPE2 = "scope2", "Scope 2"
        SCOPE3 = "scope3", "Scope 3"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="sources")
    source_type = models.CharField(max_length=20, choices=SourceType.choices)
    scope = models.CharField(max_length=10, choices=EmissionScope.choices)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    # raw payload preserved — S3 key or inline JSON for smaller payloads
    raw_payload = models.JSONField()
    filename = models.CharField(max_length=500, blank=True)
    row_count = models.IntegerField(default=0)

    class Meta:
        db_table = "data_sources"
        indexes = [
            models.Index(fields=["tenant", "source_type"]),
            models.Index(fields=["tenant", "uploaded_at"]),
        ]


class RawRecord(models.Model):
    """
    Immutable. Written once at ingest time, never updated.
    Preserves original field names and values exactly as received.
    This is the source of truth for dispute resolution.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source = models.ForeignKey(DataSource, on_delete=models.CASCADE, related_name="raw_records")
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    row_index = models.IntegerField()  # position in original upload
    raw_data = models.JSONField()  # original field names + values

    class Meta:
        db_table = "raw_records"
        unique_together = [("source", "row_index")]
        indexes = [models.Index(fields=["tenant", "source"])]


class PlantMapping(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    plant_code = models.CharField(max_length=50)
    facility_name = models.CharField(max_length=200)
    country = models.CharField(max_length=100, blank=True)
    region = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = "plant_mappings"
        unique_together = [("tenant", "plant_code")]


class EmissionFactor(models.Model):
    """
    Emission intensity per unit per category.
    Source: DEFRA / GHG Protocol. Versioned so historical calcs stay valid.
    """
    category = models.CharField(max_length=100)  # e.g. "diesel", "natural_gas", "electricity_uk"
    unit = models.CharField(max_length=50)        # "liter", "kwh", "km"
    kg_co2e_per_unit = models.DecimalField(max_digits=10, decimal_places=6)
    source = models.CharField(max_length=200)     # e.g. "DEFRA 2023"
    valid_from = models.DateField()
    valid_to = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "emission_factors"
        indexes = [models.Index(fields=["category", "valid_from"])]


class NormalizedEmissionRecord(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        WARNING = "warning", "Warning"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        LOCKED = "locked", "Locked"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    raw_record = models.OneToOneField(RawRecord, on_delete=models.CASCADE, related_name="normalized")
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    source = models.ForeignKey(DataSource, on_delete=models.CASCADE, related_name="normalized_records")

    # Common fields across all source types
    emission_scope = models.CharField(max_length=10, choices=DataSource.EmissionScope.choices)
    category = models.CharField(max_length=100)  # diesel / electricity / flight / hotel
    quantity_normalized = models.DecimalField(max_digits=14, decimal_places=4, null=True)
    unit_normalized = models.CharField(max_length=50, blank=True)
    emission_factor = models.ForeignKey(EmissionFactor, on_delete=models.SET_NULL, null=True)
    kg_co2e = models.DecimalField(max_digits=14, decimal_places=4, null=True)

    # Source-specific structured fields after normalization
    structured_data = models.JSONField(default=dict)

    # Review state
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    warning_flags = models.JSONField(default=list)  # list of flag codes
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_records"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    # Period
    period_start = models.DateField(null=True)
    period_end = models.DateField(null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "normalized_emission_records"
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "emission_scope"]),
            models.Index(fields=["tenant", "created_at"]),
            models.Index(fields=["status", "created_at"]),
        ]