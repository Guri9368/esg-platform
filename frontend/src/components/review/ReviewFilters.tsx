"use client";

interface Filters {
  status: string;
  scope: string;
  source_type: string;
  search: string;
}

interface Props {
  filters: Filters;
  onChange: (key: keyof Filters, value: string) => void;
  totalCount?: number;
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "warning", label: "Warning" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "locked", label: "Locked" },
];

const SCOPE_OPTIONS = [
  { value: "", label: "All scopes" },
  { value: "scope1", label: "Scope 1" },
  { value: "scope2", label: "Scope 2" },
  { value: "scope3", label: "Scope 3" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All sources" },
  { value: "sap", label: "SAP Fuel" },
  { value: "utility", label: "Utility" },
  { value: "travel", label: "Travel" },
];

export function ReviewFilters({ filters, onChange, totalCount }: Props) {
  const hasActiveFilters =
    filters.status || filters.scope || filters.source_type || filters.search;

  function clearAll() {
    onChange("status", "");
    onChange("scope", "");
    onChange("source_type", "");
    onChange("search", "");
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <input
        type="text"
        placeholder="Search records..."
        value={filters.search}
        onChange={(e) => onChange("search", e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <Select
        value={filters.status}
        onChange={(v) => onChange("status", v)}
        options={STATUS_OPTIONS}
      />
      <Select
        value={filters.scope}
        onChange={(v) => onChange("scope", v)}
        options={SCOPE_OPTIONS}
      />
      <Select
        value={filters.source_type}
        onChange={(v) => onChange("source_type", v)}
        options={SOURCE_OPTIONS}
      />

      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors"
        >
          Clear filters
        </button>
      )}

      {totalCount !== undefined && (
        <span className="ml-auto text-xs text-gray-400">
          {totalCount.toLocaleString()} record{totalCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-300 rounded-md px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}