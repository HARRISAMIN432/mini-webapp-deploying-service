"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, ApiError } from "@/lib/api";
import type { Deployment } from "@/lib/types/dashboard";

type EnvVar = { key: string; value: string };

const frameworkOptions = [
  { label: "Next.js", icon: "▲", value: "Next.js" },
  { label: "React Vite", icon: "⚡", value: "React (Vite)" },
  { label: "Node.js", icon: "⬡", value: "Node.js (Express)" },
  { label: "NestJS", icon: "🐈", value: "NestJS" },
  { label: "Python", icon: "🐍", value: "Python (Django/Flask)" },
  { label: "Other", icon: "◎", value: "Other" },
] as const;

type FrameworkValue = (typeof frameworkOptions)[number]["value"];

const frameworkDefaults: Record<
  FrameworkValue,
  { installCommand: string; buildCommand: string; outputDirectory: string }
> = {
  "Next.js": {
    installCommand: "npm install",
    buildCommand: "npm run build",
    outputDirectory: ".next",
  },
  "React (Vite)": {
    installCommand: "npm install",
    buildCommand: "npm run build",
    outputDirectory: "dist",
  },
  "Node.js (Express)": {
    installCommand: "npm install",
    buildCommand: "npm run build",
    outputDirectory: "dist",
  },
  NestJS: {
    installCommand: "npm install",
    buildCommand: "npm run build",
    outputDirectory: "dist",
  },
  "Python (Django/Flask)": {
    installCommand: "pip install -r requirements.txt",
    buildCommand: "python manage.py collectstatic --noinput",
    outputDirectory: "staticfiles",
  },
  Other: {
    installCommand: "npm install",
    buildCommand: "npm run build",
    outputDirectory: "dist",
  },
};

function parseRepoDisplay(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.host + parsed.pathname;
  } catch {
    return url || "github.com / paste your repo URL below";
  }
}

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buildOpen, setBuildOpen] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    repoUrl: "",
    framework: "Next.js" as FrameworkValue,
    branch: "main",
    rootDirectory: "./",
    installCommand: "npm install",
    buildCommand: "npm run build",
    outputDirectory: ".next",
  });
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const project = await apiRequest<{ _id: string }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          repoUrl: form.repoUrl,
          framework: form.framework,
          branch: form.branch,
          rootDirectory: form.rootDirectory,
          installCommand: form.installCommand,
          buildCommand: form.buildCommand,
          outputDirectory: form.outputDirectory,
          envVars: envVars.filter((v) => v.key.trim().length > 0),
        }),
      });

      const deployment = await apiRequest<Deployment>(
        `/api/projects/${project._id}/deploy`,
        { method: "POST" },
      );

      if (deployment?._id)
        router.push(`/dashboard/deployments/${deployment._id}`);
      else router.push("/dashboard/deployments");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl" style={{ fontFamily: "'Sora', sans-serif" }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            ← Projects
          </button>
          <span className="text-slate-800">·</span>
          <span className="text-xs text-slate-700">New Project</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">
          Deploy a{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #818cf8, #6366f1)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            new project
          </span>
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Connect a GitHub repository and configure your deployment
        </p>
      </div>

      {/* Repo Banner */}
      <div className="flex items-center gap-3.5 border border-slate-800 bg-[#0c1425] rounded-2xl p-4 mb-6">
        <div className="w-9 h-9 rounded-lg bg-[#161f35] border border-slate-800 flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#475569">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-0.5">
            Importing from
          </div>
          <div className="text-[13px] text-slate-400 font-mono truncate">
            {parseRepoDisplay(form.repoUrl)}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-green-400 bg-green-500/8 border border-green-500/15 rounded-full px-2.5 py-1 flex-shrink-0">
          <span
            className="w-1.5 h-1.5 rounded-full bg-green-400"
            style={{ animation: "pulse 2s infinite" }}
          />
          Ready
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Project Details */}
        <div>
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2.5">
            Project details
          </p>
          <div className="bg-[#0c1425] border border-[#1a2540] rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-slate-500">
                  Project name <span className="text-indigo-400">*</span>
                </span>
                <input
                  className="w-full bg-[#0a1020] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-700"
                  placeholder="my-awesome-app"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-medium text-slate-500">
                  Git branch <span className="text-indigo-400">*</span>
                </span>
                <input
                  className="w-full bg-[#0a1020] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-[13px] text-slate-300 font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-700"
                  placeholder="main"
                  value={form.branch}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, branch: e.target.value }))
                  }
                  required
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-slate-500">
                GitHub repository URL <span className="text-indigo-400">*</span>
              </span>
              <input
                className="w-full bg-[#0a1020] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-[13px] text-slate-300 font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-700"
                placeholder="https://github.com/username/repository"
                value={form.repoUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, repoUrl: e.target.value }))
                }
                required
              />
            </label>
          </div>
        </div>

        {/* Framework */}
        <div>
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2.5">
            Framework
          </p>
          <div className="bg-[#0c1425] border border-[#1a2540] rounded-2xl p-5">
            <div className="grid grid-cols-3 gap-2">
              {frameworkOptions.map((fw) => (
                <button
                  key={fw.value}
                  type="button"
                  onClick={() => {
                    const defaults = frameworkDefaults[fw.value];
                    setForm((f) => ({
                      ...f,
                      framework: fw.value,
                      installCommand: defaults.installCommand,
                      buildCommand: defaults.buildCommand,
                      outputDirectory: defaults.outputDirectory,
                    }));
                  }}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-[11px] transition-all ${
                    form.framework === fw.value
                      ? "border-indigo-500 bg-indigo-500/8 text-indigo-400 shadow-[0_0_0_1px_#6366f1]"
                      : "border-[#1e293b] bg-[#0a1020] text-slate-500 hover:border-slate-600 hover:text-slate-400"
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-md flex items-center justify-center text-sm ${
                      form.framework === fw.value
                        ? "bg-indigo-500/15"
                        : "bg-[#111c30]"
                    }`}
                  >
                    {fw.icon}
                  </span>
                  {fw.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Build Settings */}
        <div className="bg-[#0c1425] border border-[#1a2540] rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setBuildOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-400">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="m8 21 4-4 4 4" />
                <path d="M8 10l4-4 4 4" />
              </svg>
              Build &amp; output settings
            </span>
            <span
              className="text-slate-600 text-xs transition-transform duration-200"
              style={{
                transform: buildOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              ▼
            </span>
          </button>

          {buildOpen && (
            <div className="px-5 pb-5 border-t border-[#111c30] pt-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-slate-500">
                    Root directory
                  </span>
                  <input
                    className="w-full bg-[#0a1020] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-300 font-mono outline-none focus:border-indigo-500 transition-all"
                    value={form.rootDirectory}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, rootDirectory: e.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-slate-500">
                    Install command
                  </span>
                  <input
                    className="w-full bg-[#0a1020] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-300 font-mono outline-none focus:border-indigo-500 transition-all"
                    value={form.installCommand}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        installCommand: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-slate-500">
                    Build command
                  </span>
                  <input
                    className="w-full bg-[#0a1020] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-300 font-mono outline-none focus:border-indigo-500 transition-all"
                    value={form.buildCommand}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, buildCommand: e.target.value }))
                    }
                  />
                </label>
              </div>
              <label
                className="flex flex-col gap-1.5"
                style={{ maxWidth: 220 }}
              >
                <span className="text-[11px] font-medium text-slate-500">
                  Output directory
                </span>
                <input
                  className="w-full bg-[#0a1020] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-300 font-mono outline-none focus:border-indigo-500 transition-all"
                  value={form.outputDirectory}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, outputDirectory: e.target.value }))
                  }
                />
              </label>
            </div>
          )}
        </div>

        {/* Env Vars */}
        <div className="bg-[#0c1425] border border-[#1a2540] rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setEnvOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-400">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Environment variables
              {envVars.length > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/12 text-indigo-400 border border-indigo-500/20">
                  {envVars.length}
                </span>
              )}
            </span>
            <span
              className="text-slate-600 text-xs transition-transform duration-200"
              style={{ transform: envOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              ▼
            </span>
          </button>

          {envOpen && (
            <div className="px-5 pb-5 border-t border-[#111c30] pt-4 space-y-2">
              {envVars.map((item, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 items-center"
                  style={{ gridTemplateColumns: "1fr 1fr auto" }}
                >
                  <input
                    className="bg-[#0a1020] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-300 font-mono outline-none focus:border-indigo-500 transition-all"
                    placeholder="API_KEY"
                    value={item.key}
                    onChange={(e) =>
                      setEnvVars((prev) =>
                        prev.map((entry, i) =>
                          i === idx ? { ...entry, key: e.target.value } : entry,
                        ),
                      )
                    }
                  />
                  <input
                    className="bg-[#0a1020] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-300 font-mono outline-none focus:border-indigo-500 transition-all"
                    placeholder="your_value_here"
                    value={item.value}
                    onChange={(e) =>
                      setEnvVars((prev) =>
                        prev.map((entry, i) =>
                          i === idx
                            ? { ...entry, value: e.target.value }
                            : entry,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setEnvVars((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#1e293b] text-slate-600 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/6 transition-all text-base leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setEnvVars((prev) => [...prev, { key: "", value: "" }])
                }
                className="w-full flex items-center justify-center gap-1.5 border border-dashed border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-600 hover:border-indigo-500/40 hover:text-indigo-400 hover:bg-indigo-500/4 transition-all mt-1"
              >
                + Add variable
              </button>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-3 bg-transparent border border-[#1e293b] rounded-xl text-sm text-slate-500 hover:border-slate-600 hover:text-slate-400 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(99,102,241,0.3)] active:translate-y-0"
          >
            {!loading && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              </svg>
            )}
            {loading ? "Creating & deploying..." : "Create & deploy"}
          </button>
        </div>
      </form>

      <style
        dangerouslySetInnerHTML={{
          __html: `
    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.4;
      }
    }
  `,
        }}
      />
    </div>
  );
}
