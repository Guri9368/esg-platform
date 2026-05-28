// frontend/src/types/index.ts

export type UserRole = "admin" | "analyst" | "viewer";

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  tenant_name: string;
}

export type RecordStatus = "pending" | "warning" | "approved" | "rejected" | "locked";
export type EmissionScope = "scope1" | "scope2" | "scope3";
export type SourceType = "sap" | "utility" | "travel";

export interface NormalizedRecord {
  id: string;
  source_type: SourceType;
  emission_scope: EmissionScope;
  category: string;
  quantity_normalized: string | null;
  unit_normalized: string;
  kg_co2e: string | null;
  status: RecordStatus;
  warning_flags: string[];
  period_start: string | null;
  period_end: string | null;
  structured_data: Record<string, unknown>;
  raw_data: Record<string, unknown>;
  created_at: string;
}

export interface NormalizedRecordDetail extends NormalizedRecord {
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  source: DataSource;
}

export interface DataSource {
  id: string;
  source_type: SourceType;
  scope: EmissionScope;
  uploaded_by_name: string;
  uploaded_at: string;
  filename: string;
  row_count: number;
}

export interface AuditLogEntry {
  id: string;
  record_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by_name: string;
  changed_at: string;
  change_reason: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}