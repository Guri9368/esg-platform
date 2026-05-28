# backend/apps/audit/models.py
# (Already defined in schema section — shown here for completeness)

import uuid
from django.db import models
from apps.tenants.models import Tenant
from apps.accounts.models import User


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    record_id = models.UUIDField()
    record_type = models.CharField(max_length=100)
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