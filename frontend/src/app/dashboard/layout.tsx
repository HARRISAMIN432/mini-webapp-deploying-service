import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <DashboardSidebar />
      <main className="ml-72 min-h-screen">{children}</main>
    </div>
  );
}
