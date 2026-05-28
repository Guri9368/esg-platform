"use client";

import { useRef, DragEvent, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description: string;
  scope: string;
  icon: React.ReactNode;
  accept: string;
  loading: boolean;
  isApiOnly?: boolean;
  onFile?: (file: File) => void;
}

export function UploadCard({
  title,
  description,
  scope,
  icon,
  accept,
  loading,
  isApiOnly,
  onFile,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (isApiOnly || loading) return;
    const file = e.dataTransfer.files[0];
    if (file && onFile) onFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && onFile) onFile(file);
    e.target.value = "";
  }

  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-4 transition-colors",
        dragging && !isApiOnly && "border-blue-400 bg-blue-50/30"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (!isApiOnly) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="p-2 bg-gray-50 rounded-md border border-gray-100">
          {icon}
        </div>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
          {scope}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Action */}
      {isApiOnly ? (
        <div className="border border-dashed border-gray-200 rounded-md px-3 py-3 text-center">
          <p className="text-xs text-gray-400 font-mono">
            POST /api/travel/import/
          </p>
          <p className="text-xs text-gray-300 mt-0.5">JSON payload</p>
        </div>
      ) : (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2 text-sm font-medium border rounded-md transition-colors",
              loading
                ? "opacity-50 cursor-not-allowed border-gray-200 text-gray-400"
                : "border-blue-200 text-blue-700 hover:bg-blue-50"
            )}
          >
            <Upload size={14} />
            {loading ? "Uploading..." : "Choose CSV"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFileInput}
          />
          {!loading && (
            <p className="text-center text-xs text-gray-300 -mt-2">
              or drag and drop
            </p>
          )}
        </>
      )}
    </div>
  );
}