// frontend/src/components/review/StatusBadge.tsx

import { RecordStatus } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<RecordStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  warning: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  locked: "bg-blue-100 text-blue-800",
};

const STATUS_LABELS: Record<RecordStatus, string> = {
  pending: "Pending",
  warning: "Warning",
  approved: "Approved",
  rejected: "Rejected",
  locked: "Locked",
};

export function StatusBadge({ status }: { status: RecordStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        STATUS_STYLES[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}