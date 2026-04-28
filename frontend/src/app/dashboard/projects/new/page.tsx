"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest, ApiError } from "@/lib/api";
import type { Deployment } from "@/lib/types/dashboard";

type EnvVar = { key: string; value: string };

const frameworkOptions = [
  { label: "Next.js", icon: "▲", value: "Next.js" },
  { label: "React Vite", icon: "⚡", value: "React (Vite)" },
  { label: "Node.js", icon: "⬡", value: "Node.js (Express)" },
  { label: "Python", icon: "🐍", value: "Python (Django/Flask)" },
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
  "Python (Django/Flask)": {
    installCommand: "pip install -r requirements.txt",
    buildCommand: "python manage.py collectstatic --noinput",
    outputDirectory: "staticfiles",
  },
};

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
    <div className="p-8 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link
          href="/dashboard/projects"
          className="hover:text-gray-700 transition-colors"
        >
          Projects
        </Link>
        <span>/</span>
        <span className="text-gray-400">New Project</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Create a new project
        </h1>
        <p className="text-sm text-gray-500">
          Connect a GitHub repository and configure your deployment
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#EF4444" strokeWidth="1.5" />
            <path
              d="M8 5v3.5M8 11h.01"
              stroke="#EF4444"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Project Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Project details
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-700">
                  Project name <span className="text-violet-500">*</span>
                </span>
                <input
                  className="w-full h-11 rounded-lg border border-gray-200 px-3.5 text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all placeholder:text-gray-400"
                  placeholder="my-awesome-app"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-700">
                  Git branch <span className="text-violet-500">*</span>
                </span>
                <input
                  className="w-full h-11 rounded-lg border border-gray-200 px-3.5 text-sm text-gray-900 font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all placeholder:text-gray-400"
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
              <span className="text-sm font-medium text-gray-700">
                GitHub repository URL <span className="text-violet-500">*</span>
              </span>
              <input
                className="w-full h-11 rounded-lg border border-gray-200 px-3.5 text-sm text-gray-900 font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all placeholder:text-gray-400"
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
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Framework
          </h2>
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
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border text-sm transition-all ${
                  form.framework === fw.value
                    ? "border-violet-500 bg-violet-50 text-violet-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span className="text-lg">{fw.icon}</span>
                {fw.label}
              </button>
            ))}
          </div>
        </div>

        {/* Build Settings */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setBuildOpen((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="m8 21 4-4 4 4" />
                <path d="M8 10l4-4 4 4" />
              </svg>
              Build & output settings
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${buildOpen ? "rotate-180" : ""}`}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>

          {buildOpen && (
            <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-gray-500">
                    Root directory
                  </span>
                  <input
                    className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all"
                    value={form.rootDirectory}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, rootDirectory: e.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-gray-500">
                    Install command
                  </span>
                  <input
                    className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all"
                    value={form.installCommand}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, installCommand: e.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-gray-500">
                    Build command
                  </span>
                  <input
                    className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all"
                    value={form.buildCommand}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, buildCommand: e.target.value }))
                    }
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5 max-w-[220px]">
                <span className="text-xs font-medium text-gray-500">
                  Output directory
                </span>
                <input
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all"
                  value={form.outputDirectory}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, outputDirectory: e.target.value }))
                  }
                />
              </label>
            </div>
          )}
        </div>

        {/* Environment Variables */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setEnvOpen((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Environment variables
              {envVars.length > 0 && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200">
                  {envVars.length}
                </span>
              )}
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${envOpen ? "rotate-180" : ""}`}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>

          {envOpen && (
            <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-2">
              {envVars.map((item, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 items-center"
                  style={{ gridTemplateColumns: "1fr 1fr auto" }}
                >
                  <input
                    className="h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all"
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
                    className="h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all"
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
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setEnvVars((prev) => [...prev, { key: "", value: "" }])
                }
                className="w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all mt-1"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M8 3v10M3 8h10" />
                </svg>
                Add variable
              </button>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 rounded-lg text-sm font-semibold text-white transition-all"
          >
            {loading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="opacity-25"
                  />
                  <path
                    d="M2 8a6 6 0 019.68-4.32"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="opacity-75"
                  />
                </svg>
                Creating & deploying...
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M2 8l4 4 8-8" />
                </svg>
                Create & deploy
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
