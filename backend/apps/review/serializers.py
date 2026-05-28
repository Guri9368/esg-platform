# backend/apps/review/serializers.py

from rest_framework import serializers
from .models import ReviewLog


class ReviewLogSerializer(serializers.ModelSerializer):
    analyst_name = serializers.CharField(source="analyst.username", read_only=True)

    class Meta:
        model = ReviewLog
        fields = ["id", "action", "comment", "analyst_name", "created_at"]