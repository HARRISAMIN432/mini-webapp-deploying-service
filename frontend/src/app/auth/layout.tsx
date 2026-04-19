import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayoutClient } from "@/components/auth/AuthLayoutClient";

export const metadata: Metadata = {
  title: {
    template: "%s | ShipStack",
    default: "Auth | ShipStack",
  },
  description: "Authenticate to access your ShipStack workspace.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      <AuthLayoutClient>{children}</AuthLayoutClient>
    </Suspense>
  );
}

function AuthLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#050608] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading authentication...</p>
      </div>
    </div>
  );
}
