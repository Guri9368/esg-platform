"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { AuditLogEntry, NormalizedRecordDetail } from "@/types";
import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { StatusBadge } from "@/components/review/StatusBadge";
import { formatDate, formatCO2e, SOURCE_LABELS } from "@/lib/utils";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default function AuditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: record, isLoading: recordLoading } = useQuery({
    queryKey: ["record", id],
    queryFn: async () => {
      const res = await api.get<NormalizedRecordDetail>(`/review/${id}/`);
      return res.data;
    },
  });

  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["audit", id],
    queryFn: async () => {
      const res = await api.get<AuditLogEntry[]>(`/audit/${id}/`);
      return res.data;
    },
    enabled: !!id,
  });

  const isLoading = recordLoading || logsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        Loading audit trail...
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-red-500">
        Record not found.
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Audit Trail</h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{id}</p>
        </div>
      </div>

      {/* Record summary card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
              {SOURCE_LABELS[record.source_type]} · {record.emission_scope.toUpperCase()}
            </p>
            <p className="text-sm font-semibold text-gray-900 capitalize">
              {record.category.replace(/_/g, " ")}
            </p>
          </div>
          <StatusBadge status={record.status} />
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Quantity</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">
              {record.quantity_normalized
                ? `${parseFloat(record.quantity_normalized).toLocaleString()} ${record.unit_normalized}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">CO₂e</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">
              {formatCO2e(record.kg_co2e)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Period</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">
              {formatDate(record.period_start)}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => router.push(`/review/${id}`)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ExternalLink size={12} />
            View full record
          </button>
        </div>
      </div>

      {/* Audit timeline */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-700">Change History</h2>
          {auditLogs && (
            <span className="text-xs text-gray-400">
              {auditLogs.length} event{auditLogs.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {!auditLogs || auditLogs.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            No changes recorded yet.
          </div>
        ) : (
          <AuditTimeline logs={auditLogs} />
        )}
      </div>
    </div>
  );
}