"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { Deployment } from "@/lib/types/dashboard";

export default function LogsPage() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    apiRequest<Deployment[]>("/api/projects/deployments")
      .then((deployments) => {
        const output = deployments
          .slice(0, 8)
          .flatMap((d) =>
            d.logs.map((line) => `[${new Date(d.createdAt).toLocaleTimeString()}] ${line}`),
          );
        setLines(output);
      })
      .catch(() => setLines([]));
  }, []);

  return (
    <div className="space-y-5">
      <h2
        className="text-3xl font-bold text-white"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        Logs
      </h2>

      <div className="relative overflow-hidden rounded-2xl border border-indigo-400/20 bg-[#0a1020]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(99,102,241,0.2), transparent 65%)",
          }}
        />
        <div className="relative border-b border-white/10 bg-[#0d1426] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-200/80">
            Build Terminal
          </p>
        </div>
        <pre className="max-h-[560px] overflow-auto px-4 py-4 text-sm leading-6 text-slate-200">
          {lines.length === 0
            ? "$ waiting for deployment logs..."
            : lines.map((line) => `$ ${line}`).join("\n")}
        </pre>
      </div>
    </div>
  );
}
