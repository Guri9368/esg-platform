# backend/apps/audit/serializers.py

from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.username", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id", "record_id", "field_name", "old_value", "new_value",
            "changed_by_name", "changed_at", "change_reason",
        ]