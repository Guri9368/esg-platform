"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { NormalizedRecordDetail, AuditLogEntry } from "@/types";
import { StatusBadge } from "@/components/review/StatusBadge";
import { ReviewActions } from "@/components/review/ReviewActions";
import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { formatCO2e, formatDate, SOURCE_LABELS } from "@/lib/utils";
import { ArrowLeft, AlertTriangle, History } from "lucide-react";
import Link from "next/link";

export default function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: record, isLoading } = useQuery({
    queryKey: ["record", id],
    queryFn: async () => {
      const res = await api.get<NormalizedRecordDetail>(`/review/${id}/`);
      return res.data;
    },
  });

  const { data: auditLogs } = useQuery({
    queryKey: ["audit", id],
    queryFn: async () => {
      const res = await api.get<AuditLogEntry[]>(`/audit/${id}/`);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        Loading...
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-8 text-sm text-red-500">Record not found.</div>
    );
  }

  return (
    <div className="max-w-4xl space-y-5">
      {/* Breadcrumb / nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-gray-900">
              Record Detail
            </h1>
            <StatusBadge status={record.status} />
          </div>
        </div>
        <Link
          href={`/audit/${id}`}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
        >
          <History size={13} />
          Full audit page
        </Link>
      </div>

      {/* Warning flags */}
      {record.warning_flags.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
            <span className="text-sm font-medium text-amber-900">
              {record.warning_flags.length} warning
              {record.warning_flags.length !== 1 ? "s" : ""} detected
            </span>
          </div>
          <ul className="space-y-0.5">
            {record.warning_flags.map((flag) => (
              <li key={flag} className="text-xs text-amber-700">
                · {flag.replace(/_/g, " ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Normalized data */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Normalized Data
          </h2>
          <dl className="space-y-3">
            <Field
              label="Source"
              value={SOURCE_LABELS[record.source_type]}
            />
            <Field
              label="Scope"
              value={record.emission_scope.replace("scope", "Scope ")}
            />
            <Field
              label="Category"
              value={record.category.replace(/_/g, " ")}
            />
            <Field
              label="Quantity"
              value={
                record.quantity_normalized
                  ? `${parseFloat(
                      record.quantity_normalized
                    ).toLocaleString()} ${record.unit_normalized}`
                  : "—"
              }
            />
            <Field label="CO₂e" value={formatCO2e(record.kg_co2e)} />
            <Field label="Period start" value={formatDate(record.period_start)} />
            <Field label="Period end" value={formatDate(record.period_end)} />
            {record.reviewed_by_name && (
              <Field
                label="Reviewed by"
                value={`${record.reviewed_by_name} · ${formatDate(
                  record.reviewed_at
                )}`}
              />
            )}
          </dl>
        </div>

        {/* Raw source data */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Raw Source Data
          </h2>
          <div className="bg-gray-50 border border-gray-100 rounded text-xs font-mono p-3 overflow-auto max-h-72 leading-relaxed">
            <pre>{JSON.stringify(record.raw_data, null, 2)}</pre>
          </div>
        </div>
      </div>

      {/* Structured / enriched fields */}
      {Object.keys(record.structured_data).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Structured Fields
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(record.structured_data)
              .filter(([, v]) => v !== null && v !== undefined && v !== "")
              .map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs text-gray-400 capitalize">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm text-gray-900 font-medium mt-0.5">
                    {String(value)}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Review actions */}
      <ReviewActions record={record} />

      {/* Inline audit trail (condensed) */}
      {auditLogs && auditLogs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">
              Recent Changes
            </h2>
            <Link
              href={`/audit/${id}`}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              View full timeline →
            </Link>
          </div>
          {/* Show only last 3 changes inline */}
          <AuditTimeline logs={auditLogs.slice(-3).reverse()} />
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 items-baseline">
      <dt className="text-xs text-gray-400 font-medium shrink-0">{label}</dt>
      <dd className="text-xs text-gray-900 text-right capitalize truncate">
        {value || "—"}
      </dd>
    </div>
  );
}