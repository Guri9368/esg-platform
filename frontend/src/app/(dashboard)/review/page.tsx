"use client";

import { useState } from "react";
import { useReviewQueue } from "@/hooks/useReviewQueue";
import { ReviewTable } from "@/components/review/ReviewTable";
import { ReviewFilters } from "@/components/review/ReviewFilters";

interface Filters {
  status: string;
  scope: string;
  source_type: string;
  search: string;
  page: number;
}

export default function ReviewQueuePage() {
  const [filters, setFilters] = useState<Filters>({
    status: "",
    scope: "",
    source_type: "",
    search: "",
    page: 1,
  });

  const { data, isLoading, isError } = useReviewQueue({
    status: filters.status || undefined,
    scope: filters.scope || undefined,
    source_type: filters.source_type || undefined,
    search: filters.search || undefined,
    page: filters.page,
  });

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  }

  const totalPages = data ? Math.ceil(data.count / 50) : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Review Queue</h1>
      </div>

      <ReviewFilters
        filters={{
          status: filters.status,
          scope: filters.scope,
          source_type: filters.source_type,
          search: filters.search,
        }}
        onChange={updateFilter}
        totalCount={data?.count}
      />

      <ReviewTable
        data={data?.results || []}
        isLoading={isLoading}
        isError={isError}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {filters.page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={filters.page <= 1}
              onClick={() =>
                setFilters((f) => ({ ...f, page: f.page - 1 }))
              }
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <button
              disabled={!data?.next}
              onClick={() =>
                setFilters((f) => ({ ...f, page: f.page + 1 }))
              }
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}