# backend/apps/ingestion/serializers.py

from rest_framework import serializers
from .models import DataSource, NormalizedEmissionRecord, RawRecord


class DataSourceSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.username", read_only=True)

    class Meta:
        model = DataSource
        fields = [
            "id", "source_type", "scope", "uploaded_by_name",
            "uploaded_at", "filename", "row_count",
        ]


class NormalizedRecordListSerializer(serializers.ModelSerializer):
    source_type = serializers.CharField(source="source.source_type", read_only=True)
    raw_data = serializers.JSONField(source="raw_record.raw_data", read_only=True)

    class Meta:
        model = NormalizedEmissionRecord
        fields = [
            "id", "source_type", "emission_scope", "category",
            "quantity_normalized", "unit_normalized", "kg_co2e",
            "status", "warning_flags", "period_start", "period_end",
            "structured_data", "raw_data", "created_at",
        ]


class NormalizedRecordDetailSerializer(NormalizedRecordListSerializer):
    reviewed_by_name = serializers.CharField(source="reviewed_by.username", read_only=True)
    source = DataSourceSerializer(read_only=True)

    class Meta(NormalizedRecordListSerializer.Meta):
        fields = NormalizedRecordListSerializer.Meta.fields + [
            "reviewed_by_name", "reviewed_at", "source",
        ]