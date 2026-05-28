# backend/apps/audit/utils.py

from .models import AuditLog


def log_change(tenant, record, field_name, old_value, new_value, changed_by, reason=""):
    AuditLog.objects.create(
        tenant=tenant,
        record_id=record.pk,
        record_type=type(record).__name__,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        changed_by=changed_by,
        change_reason=reason,
    )