// frontend/src/lib/utils.ts

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { RecordStatus, EmissionScope, SourceType } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_LABELS: Record<RecordStatus, string> = {
  pending: "Pending",
  warning: "Warning",
  approved: "Approved",
  rejected: "Rejected",
  locked: "Locked",
};

export const SCOPE_LABELS: Record<EmissionScope, string> = {
  scope1: "Scope 1",
  scope2: "Scope 2",
  scope3: "Scope 3",
};

export const SOURCE_LABELS: Record<SourceType, string> = {
  sap: "SAP Fuel",
  utility: "Utility",
  travel: "Travel",
};

export function formatCO2e(value: string | null): string {
  if (!value) return "—";
  const num = parseFloat(value);
  if (num >= 1000) return `${(num / 1000).toFixed(2)} tCO₂e`;
  return `${num.toFixed(2)} kgCO₂e`;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}