import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

interface UploadResult {
  source_id: string;
  rows_ingested: number;
}

type UploadSource = "sap" | "utility";

export function useUpload() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<UploadSource | null>(null);
  const [lastResult, setLastResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(source: UploadSource, file: File) {
    setUploading(source);
    setError(null);
    setLastResult(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const { data } = await api.post<UploadResult>(
        `/upload/${source}/`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setLastResult(data);
      // Invalidate both upload history and review queue
      queryClient.invalidateQueries({ queryKey: ["upload-history"] });
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["review-queue-stats"] });
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Upload failed. Verify your file format and try again.";
      setError(msg);
    } finally {
      setUploading(null);
    }
  }

  function clearState() {
    setLastResult(null);
    setError(null);
  }

  return { uploadFile, uploading, lastResult, error, clearState };
}