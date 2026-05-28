# backend/apps/review/views.py

from django.utils import timezone
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView

from apps.tenants.utils import get_tenant
from apps.ingestion.models import NormalizedEmissionRecord
from apps.ingestion.serializers import NormalizedRecordListSerializer, NormalizedRecordDetailSerializer
from apps.audit.utils import log_change
from .models import ReviewLog
from .serializers import ReviewLogSerializer


class ReviewQueueView(ListAPIView):
    serializer_class = NormalizedRecordListSerializer

    def get_queryset(self):
        tenant = get_tenant(self.request)
        qs = NormalizedEmissionRecord.objects.filter(tenant=tenant).select_related(
            "source", "raw_record", "emission_factor"
        )

        status_filter = self.request.query_params.get("status")
        scope_filter = self.request.query_params.get("scope")
        source_type = self.request.query_params.get("source_type")
        search = self.request.query_params.get("search")

        if status_filter:
            qs = qs.filter(status=status_filter)
        if scope_filter:
            qs = qs.filter(emission_scope=scope_filter)
        if source_type:
            qs = qs.filter(source__source_type=source_type)
        if search:
            qs = qs.filter(structured_data__icontains=search)

        return qs.order_by("-created_at")


class RecordDetailView(RetrieveAPIView):
    serializer_class = NormalizedRecordDetailSerializer

    def get_queryset(self):
        return NormalizedEmissionRecord.objects.filter(
            tenant=get_tenant(self.request)
        ).select_related("source", "raw_record", "emission_factor", "reviewed_by")


class ReviewActionView(APIView):
    """
    PATCH /api/review/<id>/

    Handles approve, reject, and field edits.
    Locked records cannot be modified.
    """

    def patch(self, request, pk):
        tenant = get_tenant(request)

        try:
            record = NormalizedEmissionRecord.objects.get(pk=pk, tenant=tenant)
        except NormalizedEmissionRecord.DoesNotExist:
            return Response({"error": "Record not found."}, status=404)

        if record.status == NormalizedEmissionRecord.Status.LOCKED:
            return Response({"error": "Record is locked and cannot be modified."}, status=403)

        action = request.data.get("action")
        comment = request.data.get("comment", "")

        if action not in ("approve", "reject", "edit"):
            return Response({"error": "Invalid action. Must be approve, reject, or edit."}, status=400)

        # Only admins and analysts can take review actions
        if request.user.role not in ("admin", "analyst"):
            return Response({"error": "Insufficient permissions."}, status=403)

        with transaction.atomic():
            old_status = record.status
            changes = {}

            if action == "approve":
                record.status = NormalizedEmissionRecord.Status.APPROVED
                record.reviewed_by = request.user
                record.reviewed_at = timezone.now()
                changes["status"] = (old_status, record.status)

            elif action == "reject":
                if not comment:
                    return Response({"error": "Comment required when rejecting."}, status=400)
                record.status = NormalizedEmissionRecord.Status.REJECTED
                record.reviewed_by = request.user
                record.reviewed_at = timezone.now()
                changes["status"] = (old_status, record.status)

            elif action == "edit":
                editable_fields = {"quantity_normalized", "unit_normalized", "kg_co2e", "category"}
                edits = {k: v for k, v in request.data.items() if k in editable_fields}
                if not edits:
                    return Response({"error": "No valid editable fields provided."}, status=400)
                for field, value in edits.items():
                    old_val = getattr(record, field)
                    setattr(record, field, value)
                    changes[field] = (str(old_val), str(value))
                # Edited records go back to pending for re-review
                if record.status not in (
                    NormalizedEmissionRecord.Status.PENDING,
                    NormalizedEmissionRecord.Status.WARNING,
                ):
                    record.status = NormalizedEmissionRecord.Status.PENDING
                    changes["status"] = (old_status, record.status)

            record.save()

            # Log review action
            ReviewLog.objects.create(
                record=record,
                tenant=tenant,
                analyst=request.user,
                action=ReviewLog.Action.APPROVED if action == "approve"
                       else ReviewLog.Action.REJECTED if action == "reject"
                       else ReviewLog.Action.EDITED,
                comment=comment,
            )

            # Audit every field change
            for field, (old_val, new_val) in changes.items():
                log_change(
                    tenant=tenant,
                    record=record,
                    field_name=field,
                    old_value=old_val,
                    new_value=new_val,
                    changed_by=request.user,
                    reason=comment,
                )

        return Response(NormalizedRecordDetailSerializer(record).data)


class LockRecordView(APIView):
    """
    POST /api/review/<id>/lock/
    Admin-only. Locks a record for compliance audit.
    """
    def post(self, request, pk):
        if request.user.role != "admin":
            return Response({"error": "Admin only."}, status=403)

        tenant = get_tenant(request)
        try:
            record = NormalizedEmissionRecord.objects.get(pk=pk, tenant=tenant)
        except NormalizedEmissionRecord.DoesNotExist:
            return Response({"error": "Not found."}, status=404)

        if record.status != NormalizedEmissionRecord.Status.APPROVED:
            return Response({"error": "Only approved records can be locked."}, status=400)

        with transaction.atomic():
            old_status = record.status
            record.status = NormalizedEmissionRecord.Status.LOCKED
            record.save(update_fields=["status"])

            log_change(
                tenant=tenant,
                record=record,
                field_name="status",
                old_value=old_status,
                new_value=record.status,
                changed_by=request.user,
                reason="Compliance lock",
            )

        return Response({"status": "locked"})


class RecordAuditView(APIView):
    """
    GET /api/audit/<record_id>/
    Returns full audit trail for a specific record.
    """
    def get(self, request, record_id):
        from apps.audit.models import AuditLog
        from apps.audit.serializers import AuditLogSerializer

        tenant = get_tenant(request)
        logs = AuditLog.objects.filter(
            tenant=tenant, record_id=record_id
        ).order_by("changed_at")

        return Response(AuditLogSerializer(logs, many=True).data)