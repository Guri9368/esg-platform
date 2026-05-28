"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { NormalizedRecord, RecordStatus, EmissionScope, SourceType } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { formatCO2e, formatDate, SCOPE_LABELS, SOURCE_LABELS } from "@/lib/utils";
import { AlertTriangle, ChevronRight } from "lucide-react";

interface Props {
  data: NormalizedRecord[];
  isLoading: boolean;
  isError: boolean;
}

const columnHelper = createColumnHelper<NormalizedRecord>();

export function ReviewTable({ data, isLoading, isError }: Props) {
  const router = useRouter();

  const columns = useMemo(
    () => [
      columnHelper.accessor("status", {
        header: "Status",
        size: 140,
        cell: (info) => (
          <div className="flex items-center gap-2">
            <StatusBadge status={info.getValue() as RecordStatus} />
            {info.row.original.warning_flags.length > 0 && (
              <AlertTriangle
                size={13}
                className="text-amber-400 shrink-0"
                title={`${info.row.original.warning_flags.length} warning(s)`}
              />
            )}
          </div>
        ),
      }),
      columnHelper.accessor("source_type", {
        header: "Source",
        size: 110,
        cell: (info) =>
          SOURCE_LABELS[info.getValue() as SourceType] || info.getValue(),
      }),
      columnHelper.accessor("emission_scope", {
        header: "Scope",
        size: 80,
        cell: (info) => (
          <span className="text-xs font-medium text-gray-600">
            {SCOPE_LABELS[info.getValue() as EmissionScope]}
          </span>
        ),
      }),
      columnHelper.accessor("category", {
        header: "Category",
        size: 130,
        cell: (info) => (
          <span className="capitalize text-gray-900">
            {info.getValue().replace(/_/g, " ")}
          </span>
        ),
      }),
      columnHelper.accessor("quantity_normalized", {
        header: "Quantity",
        size: 140,
        cell: (info) => {
          const q = info.getValue();
          const u = info.row.original.unit_normalized;
          if (!q) return <span className="text-gray-300">—</span>;
          return (
            <span>
              {parseFloat(q).toLocaleString("en-GB", {
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-gray-400 text-xs">{u}</span>
            </span>
          );
        },
      }),
      columnHelper.accessor("kg_co2e", {
        header: "CO₂e",
        size: 110,
        cell: (info) => (
          <span className="font-medium">{formatCO2e(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("period_start", {
        header: "Period",
        size: 140,
        cell: (info) => {
          const start = info.getValue();
          const end = info.row.original.period_end;
          if (!start) return <span className="text-gray-300">—</span>;
          if (start === end || !end) return formatDate(start);
          return (
            <span className="text-xs">
              {formatDate(start)}
              <span className="text-gray-400"> – </span>
              {formatDate(end)}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "open",
        size: 60,
        cell: (info) => (
          <button
            onClick={() => router.push(`/review/${info.row.original.id}`)}
            className="flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
            aria-label="Open record"
          >
            View <ChevronRight size={12} />
          </button>
        ),
      }),
    ],
    [router]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isError) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-red-500">
        Failed to load records. Try refreshing.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="bg-gray-50 border-b border-gray-200">
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  style={{ width: h.column.columnDef.size }}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm text-gray-400"
              >
                <LoadingSkeleton />
              </td>
            </tr>
          ) : table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-sm text-gray-400"
              >
                No records match your filters.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => {
              const isWarning = row.original.status === "warning";
              return (
                <tr
                  key={row.id}
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                    isWarning ? "bg-amber-50/40" : ""
                  }`}
                  onClick={() => router.push(`/review/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 py-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-100 rounded animate-pulse"
          style={{ width: `${70 + (i % 3) * 10}%`, margin: "0 auto" }}
        />
      ))}
    </div>
  );
}