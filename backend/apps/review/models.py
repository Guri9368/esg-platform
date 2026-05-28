# backend/apps/review/models.py

import uuid
from django.db import models
from apps.tenants.models import Tenant
from apps.accounts.models import User
from apps.ingestion.models import NormalizedEmissionRecord


class ReviewLog(models.Model):
    """
    One entry per analyst action. Analyst may act multiple times on same record.
    Not the same as AuditLog — ReviewLog is business-level, AuditLog is field-level.
    """
    class Action(models.TextChoices):
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        EDITED = "edited", "Edited"
        FLAGGED = "flagged", "Flagged"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    record = models.ForeignKey(NormalizedEmissionRecord, on_delete=models.CASCADE, related_name="review_logs")
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    analyst = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=20, choices=Action.choices)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "review_logs"
        indexes = [models.Index(fields=["record", "created_at"])]


class AuditLog(models.Model):
    """
    Immutable append-only field-level change history.
    Never updated or deleted — compliance requirement.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    record_id = models.UUIDField()  # intentionally not FK — survives record deletion
    record_type = models.CharField(max_length=100)  # e.g. "NormalizedEmissionRecord"
    field_name = models.CharField(max_length=100)
    old_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)
    change_reason = models.CharField(max_length=500, blank=True)

    class Meta:
        db_table = "audit_logs"
        indexes = [
            models.Index(fields=["record_id", "changed_at"]),
            models.Index(fields=["tenant", "changed_at"]),
        ]