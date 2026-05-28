"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { DataSource, SourceType } from "@/types";
import { SOURCE_LABELS, SCOPE_LABELS, formatDate } from "@/lib/utils";
import { FileText, RefreshCw } from "lucide-react";

const SCOPE_COLORS: Record<string, string> = {
  scope1: "text-orange-600 bg-orange-50",
  scope2: "text-blue-600 bg-blue-50",
  scope3: "text-purple-600 bg-purple-50",
};

export function UploadHistory() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["upload-history"],
    queryFn: async () => {
      const res = await api.get<DataSource[]>("/upload/history/");
      return res.data;
    },
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">Recent Uploads</h2>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-gray-400 hover:text-gray-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw
            size={14}
            className={isFetching ? "animate-spin" : ""}
          />
        </button>
      </div>

      {isLoading ? (
        <div className="p-6 text-center text-sm text-gray-400">Loading...</div>
      ) : isError ? (
        <div className="p-6 text-center text-sm text-red-400">
          Failed to load history.
        </div>
      ) : !data || data.length === 0 ? (
        <div className="p-8 text-center">
          <FileText size={24} className="text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No uploads yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {data.map((source) => (
            <UploadRow key={source.id} source={source} />
          ))}
        </ul>
      )}
    </div>
  );
}

function UploadRow({ source }: { source: DataSource }) {
  const scopeClass =
    SCOPE_COLORS[source.scope] || "text-gray-600 bg-gray-100";

  return (
    <li className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-gray-900 truncate">
            {source.filename || "—"}
          </span>
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${scopeClass}`}
          >
            {SCOPE_LABELS[source.scope]}
          </span>
        </div>
        <p className="text-xs text-gray-400">
          {SOURCE_LABELS[source.source_type as SourceType]} ·{" "}
          {source.row_count.toLocaleString()} rows ·{" "}
          {source.uploaded_by_name}
        </p>
      </div>
      <span className="text-xs text-gray-400 shrink-0">
        {formatDate(source.uploaded_at)}
      </span>
    </li>
  );
}