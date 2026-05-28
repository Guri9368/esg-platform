"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { NormalizedRecordDetail } from "@/types";
import { useAuthStore } from "@/store/auth";
import { Lock, CheckCircle, XCircle, PenLine } from "lucide-react";

interface Props {
  record: NormalizedRecordDetail;
}

type ActionType = "approve" | "reject" | "edit" | null;

export function ReviewActions({ record }: Props) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [comment, setComment] = useState("");
  const [editValues, setEditValues] = useState({
    quantity_normalized: record.quantity_normalized || "",
    kg_co2e: record.kg_co2e || "",
  });
  const [serverError, setServerError] = useState("");

  const isLocked = record.status === "locked";
  const isViewer = user?.role === "viewer";
  const canLock = user?.role === "admin" && record.status === "approved";

  const reviewMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.patch(`/review/${record.id}/action/`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["record", record.id] });
      queryClient.invalidateQueries({ queryKey: ["audit", record.id] });
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      setActiveAction(null);
      setComment("");
      setServerError("");
    },
    onError: (err: any) => {
      setServerError(
        err.response?.data?.error || "Action failed. Please try again."
      );
    },
  });

  const lockMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/review/${record.id}/lock/`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["record", record.id] });
      queryClient.invalidateQueries({ queryKey: ["audit", record.id] });
      setServerError("");
    },
    onError: (err: any) => {
      setServerError(err.response?.data?.error || "Lock failed.");
    },
  });

  if (isLocked) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-700">
          <Lock size={14} />
          <span className="text-sm font-medium">
            Record locked for compliance audit
          </span>
        </div>
        <p className="text-xs text-blue-500 mt-1">
          This record cannot be modified. Contact an admin if changes are
          required.
        </p>
      </div>
    );
  }

  if (isViewer) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-500">
        You have view-only access. Contact an analyst to review this record.
      </div>
    );
  }

  function handleSubmitAction(action: "approve" | "reject") {
    if (action === "reject" && !comment.trim()) return;
    reviewMutation.mutate({ action, comment });
  }

  function handleSubmitEdit() {
    const payload: Record<string, unknown> = { action: "edit", comment };
    if (editValues.quantity_normalized)
      payload.quantity_normalized = editValues.quantity_normalized;
    if (editValues.kg_co2e) payload.kg_co2e = editValues.kg_co2e;
    reviewMutation.mutate(payload);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">Review Actions</h2>

      {serverError && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {serverError}
        </div>
      )}

      {/* Action selector */}
      {activeAction === null && (
        <div className="flex flex-wrap gap-2">
          <ActionButton
            onClick={() => setActiveAction("approve")}
            icon={<CheckCircle size={14} />}
            label="Approve"
            variant="green"
          />
          <ActionButton
            onClick={() => setActiveAction("reject")}
            icon={<XCircle size={14} />}
            label="Reject"
            variant="red"
          />
          <ActionButton
            onClick={() => setActiveAction("edit")}
            icon={<PenLine size={14} />}
            label="Edit Values"
            variant="gray"
          />
          {canLock && (
            <ActionButton
              onClick={() => lockMutation.mutate()}
              icon={<Lock size={14} />}
              label={lockMutation.isPending ? "Locking..." : "Lock for Audit"}
              variant="blue"
              disabled={lockMutation.isPending}
            />
          )}
        </div>
      )}

      {/* Approve flow */}
      {activeAction === "approve" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Approve this record as correct. Optionally add a comment.
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional comment..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleSubmitAction("approve")}
              disabled={reviewMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {reviewMutation.isPending ? "Approving..." : "Confirm Approve"}
            </button>
            <button
              onClick={() => {
                setActiveAction(null);
                setComment("");
              }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reject flow */}
      {activeAction === "reject" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Rejection requires a comment explaining the reason.
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Reason for rejection (required)..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleSubmitAction("reject")}
              disabled={reviewMutation.isPending || !comment.trim()}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {reviewMutation.isPending ? "Rejecting..." : "Confirm Reject"}
            </button>
            <button
              onClick={() => {
                setActiveAction(null);
                setComment("");
              }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit flow */}
      {activeAction === "edit" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Edit normalized values. Record will return to pending status after
            edit.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Quantity (normalized)
              </label>
              <input
                type="number"
                value={editValues.quantity_normalized}
                onChange={(e) =>
                  setEditValues((v) => ({
                    ...v,
                    quantity_normalized: e.target.value,
                  }))
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                CO₂e (kg)
              </label>
              <input
                type="number"
                value={editValues.kg_co2e}
                onChange={(e) =>
                  setEditValues((v) => ({ ...v, kg_co2e: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Reason for edit (optional)..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmitEdit}
              disabled={reviewMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {reviewMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => {
                setActiveAction(null);
                setComment("");
              }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  onClick,
  icon,
  label,
  variant,
  disabled = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant: "green" | "red" | "gray" | "blue";
  disabled?: boolean;
}) {
  const variantCls = {
    green:
      "border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50",
    red: "border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50",
    gray: "border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50",
    blue: "border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50",
  }[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-md transition-colors ${variantCls}`}
    >
      {icon}
      {label}
    </button>
  );
}