// frontend/src/hooks/useReviewQueue.ts

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PaginatedResponse, NormalizedRecord } from "@/types";

interface Filters {
  status?: string;
  scope?: string;
  source_type?: string;
  search?: string;
  page?: number;
}

export function useReviewQueue(filters: Filters = {}) {
  return useQuery({
    queryKey: ["review-queue", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.scope) params.set("scope", filters.scope);
      if (filters.source_type) params.set("source_type", filters.source_type);
      if (filters.search) params.set("search", filters.search);
      if (filters.page) params.set("page", String(filters.page));

      const res = await api.get<PaginatedResponse<NormalizedRecord>>(
        `/review/queue/?${params}`
      );
      return res.data;
    },
  });
}