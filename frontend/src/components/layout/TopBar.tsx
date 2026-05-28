// frontend/src/components/layout/TopBar.tsx

"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";

export function TopBar() {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {user?.tenant_name}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{user?.username}</span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
            {user?.role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}