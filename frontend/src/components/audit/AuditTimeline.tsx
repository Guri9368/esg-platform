import { AuditLogEntry } from "@/types";
import { formatDistanceToNow } from "date-fns";

interface Props {
  logs: AuditLogEntry[];
}

// Human-readable labels for field names that come from the backend
const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  quantity_normalized: "Quantity",
  unit_normalized: "Unit",
  kg_co2e: "CO₂e (kg)",
  category: "Category",
  emission_scope: "Scope",
  reviewed_by: "Reviewed by",
  reviewed_at: "Reviewed at",
};

function fieldLabel(name: string): string {
  return FIELD_LABELS[name] || name.replace(/_/g, " ");
}

function EventIcon({ fieldName }: { fieldName: string }) {
  if (fieldName === "status") {
    return (
      <div className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white ring-offset-1 shrink-0" />
    );
  }
  return (
    <div className="w-2 h-2 rounded-full bg-gray-300 ring-2 ring-white ring-offset-1 shrink-0" />
  );
}

function ValueChip({ value, variant }: { value: string | null; variant: "old" | "new" }) {
  if (!value) {
    return <span className="text-gray-300 italic">empty</span>;
  }

  const cls =
    variant === "old"
      ? "text-red-600 bg-red-50 line-through"
      : "text-green-700 bg-green-50";

  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono ${cls}`}>
      {value}
    </span>
  );
}

export function AuditTimeline({ logs }: Props) {
  return (
    <ol className="relative">
      {logs.map((log, idx) => {
        const isLast = idx === logs.length - 1;
        const timeAgo = formatDistanceToNow(new Date(log.changed_at), {
          addSuffix: true,
        });
        const exactTime = new Date(log.changed_at).toLocaleString("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        });

        return (
          <li key={log.id} className="flex gap-4">
            {/* Timeline spine */}
            <div className="flex flex-col items-center pt-1">
              <EventIcon fieldName={log.field_name} />
              {!isLast && <div className="w-px flex-1 bg-gray-100 my-1" />}
            </div>

            {/* Event body */}
            <div className={`pb-5 min-w-0 flex-1 ${isLast ? "" : ""}`}>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900">
                  {log.changed_by_name}
                </span>
                <span className="text-xs text-gray-400">
                  changed{" "}
                  <span className="text-gray-600 font-medium">
                    {fieldLabel(log.field_name)}
                  </span>
                </span>
              </div>

              {/* Value diff */}
              {(log.old_value || log.new_value) && (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <ValueChip value={log.old_value} variant="old" />
                  <span className="text-gray-300 text-xs">→</span>
                  <ValueChip value={log.new_value} variant="new" />
                </div>
              )}

              {/* Comment / reason */}
              {log.change_reason && (
                <p className="mt-1.5 text-xs text-gray-400 italic">
                  "{log.change_reason}"
                </p>
              )}

              {/* Timestamp */}
              <p className="mt-1 text-xs text-gray-300" title={exactTime}>
                {exactTime} · {timeAgo}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}