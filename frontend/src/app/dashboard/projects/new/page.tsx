"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { GitHubConnectCard } from "@/components/github/GithubConnectCard";
import { RepoPicker } from "@/components/github/RepoPicker";
import { useGithubStatus } from "@/lib/hooks/useGithubStatus";
import { apiRequest } from "@/lib/api";
import type { GithubRepo } from "@/lib/api-github";


const FRAMEWORKS = [
  { value: "nextjs", label: "Next.js" },
  { value: "react", label: "React (CRA/Vite)" },
  { value: "express", label: "Express" },
  { value: "fastapi", label: "FastAPI" },
] as const;


type DeployMode = "github" | "manual";

interface FormState {
  name: string;
  repoUrl: string;
  repoFullName: string;
  branch: string;
  framework: string;
  rootDirectory: string;
  installCommand: string;
  buildCommand: string;
  startCommand: string;
  autoDeploy: boolean;
}

const DEFAULT_FORM: FormState = {
  name: "",
  repoUrl: "",
  repoFullName: "",
  branch: "main",
  framework: "nextjs",
  rootDirectory: "./",
  installCommand: "npm install",
  buildCommand: "npm run build",
  startCommand: "",
  autoDeploy: false,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewProjectPage() {
  const router = useRouter();
  const { status: githubStatus, loading: githubLoading } = useGithubStatus();

  const [mode, setMode] = useState<DeployMode>("github");
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleRepoSelect = (repo: GithubRepo | null) => {
    setSelectedRepo(repo);
    if (!repo) {
      setForm((f) => ({ ...f, repoUrl: "", repoFullName: "", branch: "main", name: "" }));
      return;
    }
    setForm((f) => ({
      ...f,
      repoUrl: repo.html_url,
      repoFullName: repo.full_name,
      branch: repo.default_branch || "main",
      // Auto-suggest project name from repo name (user can override)
      name: f.name || repo.name,
    }));
  };

  const handleSubmit = async () => {
    setError(null);

    // Validate
    if (!form.name.trim()) return setError("Project name is required");
    if (mode === "github" && !selectedRepo)
      return setError("Please select a repository");
    if (mode === "manual" && !form.repoUrl.trim())
      return setError("Repository URL is required");
    if (!form.framework) return setError("Framework is required");

    setSubmitting(true);
    try {
      await apiRequest("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          repoUrl: form.repoUrl,
          framework: form.framework,
          branch: form.branch,
          rootDirectory: form.rootDirectory,
          installCommand: form.installCommand,
          buildCommand: form.buildCommand,
          startCommand: form.startCommand,
          autoDeploy: form.autoDeploy,
          trackedBranch: form.branch,
          repoSource: mode,
          repoFullName: mode === "github" ? form.repoFullName : undefined,
        }),
      });
      router.push("/dashboard/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const isGithubConnected = !githubLoading && githubStatus?.connected;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar />

      <main className="ml-64 flex-1 p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
                  clipRule="evenodd"
                />
              </svg>
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Create new project
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Import a repository and deploy it to ShipStack
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
            <button
              onClick={() => setMode("github")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === "github"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <GithubIcon className="w-4 h-4" />
              Import from GitHub
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === "manual"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Deploy public repo
            </button>
          </div>

          {/* Card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

            {/* ── GitHub mode ──────────────────────────────────────────────── */}
            {mode === "github" && (
              <div className="p-6 space-y-5">
                {/* GitHub connection status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    GitHub Account
                  </label>
                  <GitHubConnectCard compact />
                </div>

                {/* Repo picker (only if connected) */}
                {isGithubConnected && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Select Repository
                    </label>
                    <RepoPicker
                      onSelect={handleRepoSelect}
                      selected={selectedRepo}
                    />
                  </div>
                )}

                {/* Not connected placeholder */}
                {!githubLoading && !isGithubConnected && (
                  <div className="py-6 text-center text-sm text-gray-500">
                    Connect your GitHub account above to import repositories.
                  </div>
                )}
              </div>
            )}

            {/* ── Manual mode ──────────────────────────────────────────────── */}
            {mode === "manual" && (
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-amber-700">
                    Manual mode is for public repositories. For private repos,
                    use GitHub import above.
                  </p>
                </div>
                <FormField
                  label="Repository URL"
                  placeholder="https://github.com/owner/repo"
                  value={form.repoUrl}
                  onChange={(v) => setForm((f) => ({ ...f, repoUrl: v }))}
                />
              </div>
            )}

            {/* ── Shared fields (shown after repo selection or in manual mode) ── */}
            {(selectedRepo || mode === "manual") && (
              <div className="border-t border-gray-100 p-6 space-y-4">
                <FormField
                  label="Project Name"
                  placeholder="my-awesome-app"
                  value={form.name}
                  onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label="Branch"
                    placeholder="main"
                    value={form.branch}
                    onChange={(v) => setForm((f) => ({ ...f, branch: v }))}
                  />

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Framework
                    </label>
                    <select
                      value={form.framework}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, framework: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      {FRAMEWORKS.map((fw) => (
                        <option key={fw.value} value={fw.value}>
                          {fw.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Advanced settings toggle */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.22 5.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 010-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {showAdvanced ? "Hide" : "Show"} advanced settings
                </button>

                {showAdvanced && (
                  <div className="space-y-4 pt-1">
                    <FormField
                      label="Root Directory"
                      placeholder="./"
                      value={form.rootDirectory}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, rootDirectory: v }))
                      }
                    />
                    <FormField
                      label="Install Command"
                      placeholder="npm install"
                      value={form.installCommand}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, installCommand: v }))
                      }
                      mono
                    />
                    <FormField
                      label="Build Command"
                      placeholder="npm run build"
                      value={form.buildCommand}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, buildCommand: v }))
                      }
                      mono
                    />
                    <FormField
                      label="Start Command"
                      placeholder="node dist/index.js"
                      value={form.startCommand}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, startCommand: v }))
                      }
                      mono
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.autoDeploy}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            autoDeploy: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm text-gray-700">
                        Auto-deploy on push to{" "}
                        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                          {form.branch || "main"}
                        </code>
                      </span>
                    </label>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <svg
                      className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating project…
                    </>
                  ) : (
                    "Create & Deploy"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormField({
  label,
  placeholder,
  value,
  onChange,
  mono = false,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder-gray-300 ${mono ? "font-mono" : ""
          }`}
      />
    </div>
  );
}

function GithubIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}