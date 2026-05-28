"use client";

import { FileText, Wifi, Plane } from "lucide-react";
import { UploadCard } from "@/components/upload/UploadCard";
import { UploadHistory } from "@/components/upload/UploadHistory";
import { useUpload } from "@/hooks/useUpload";

export default function UploadPage() {
  const { uploadFile, uploading, lastResult, error, clearState } = useUpload();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Upload Center</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Ingest ESG data from enterprise sources
        </p>
      </div>

      {/* Result / error banners */}
      {lastResult && (
        <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-green-800">
            ✓ Ingested{" "}
            <span className="font-medium">{lastResult.rows_ingested}</span> rows
            successfully.
          </p>
          <button
            onClick={clearState}
            className="text-green-600 hover:text-green-800 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={clearState}
            className="text-red-600 hover:text-red-800 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload cards */}
      <div className="grid grid-cols-3 gap-4">
        <UploadCard
          title="SAP Fuel & Procurement"
          description="CSV export from SAP. Handles German column names, mixed date formats, and inconsistent unit strings."
          scope="Scope 1"
          icon={<FileText size={18} className="text-orange-600" />}
          accept=".csv"
          loading={uploading === "sap"}
          onFile={(file) => uploadFile("sap", file)}
        />

        <UploadCard
          title="Utility Electricity"
          description="Billing CSV from utility portal. Preserves overlapping billing periods and flags abnormal consumption."
          scope="Scope 2"
          icon={<Wifi size={18} className="text-blue-600" />}
          accept=".csv"
          loading={uploading === "utility"}
          onFile={(file) => uploadFile("utility", file)}
        />

        <UploadCard
          title="Corporate Travel"
          description="API import from Concur or Navan. Send JSON payload directly to the endpoint below."
          scope="Scope 3"
          icon={<Plane size={18} className="text-purple-600" />}
          accept=""
          loading={false}
          isApiOnly
        />
      </div>

      {/* Upload history */}
      <UploadHistory />
    </div>
  );
}