import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05080f] text-white">
      <DashboardSidebar />
      <main className="ml-72 min-h-screen p-8">{children}</main>
    </div>
  );
}
