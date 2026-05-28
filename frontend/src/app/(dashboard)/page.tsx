// frontend/src/app/(dashboard)/page.tsx

"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PaginatedResponse, NormalizedRecord } from "@/types";
import { formatCO2e } from "@/lib/utils";

interface Stats {
  total: number;
  pending: number;
  warning: number;
  approved: number;
  locked: number;
}

export default function DashboardPage() {
  const { data } = useQuery({
    queryKey: ["review-queue-stats"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<NormalizedRecord>>("/review/queue/?page_size=1000");
      return res.data;
    },
  });

  const records = data?.results || [];

  const stats: Stats = {
    total: data?.count || 0,
    pending: records.filter((r) => r.status === "pending").length,
    warning: records.filter((r) => r.status === "warning").length,
    approved: records.filter((r) => r.status === "approved").length,
    locked: records.filter((r) => r.status === "locked").length,
  };

  const totalCO2e = records
    .filter((r) => r.kg_co2e)
    .reduce((sum, r) => sum + parseFloat(r.kg_co2e!), 0);

  const scope1CO2e = records
    .filter((r) => r.emission_scope === "scope1" && r.kg_co2e)
    .reduce((sum, r) => sum + parseFloat(r.kg_co2e!), 0);

  const scope2CO2e = records
    .filter((r) => r.emission_scope === "scope2" && r.kg_co2e)
    .reduce((sum, r) => sum + parseFloat(r.kg_co2e!), 0);

  const scope3CO2e = records
    .filter((r) => r.emission_scope === "scope3" && r.kg_co2e)
    .reduce((sum, r) => sum + parseFloat(r.kg_co2e!), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          ESG data ingestion and review status
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Records", value: stats.total },
          { label: "Pending Review", value: stats.pending, highlight: "text-amber-600" },
          { label: "Warnings", value: stats.warning, highlight: "text-orange-600" },
          { label: "Locked", value: stats.locked, highlight: "text-green-700" },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-semibold mt-1 ${highlight || "text-gray-900"}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Emissions by Scope</h2>
        <div className="grid grid-cols-3 gap-6">
          {[
            { scope: "Scope 1", value: scope1CO2e, color: "bg-orange-500" },
            { scope: "Scope 2", value: scope2CO2e, color: "bg-blue-500" },
            { scope: "Scope 3", value: scope3CO2e, color: "bg-purple-500" },
          ].map(({ scope, value, color }) => (
            <div key={scope}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-xs text-gray-600 font-medium">{scope}</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">{formatCO2e(value.toString())}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {totalCO2e > 0 ? ((value / totalCO2e) * 100).toFixed(1) : 0}% of total
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}