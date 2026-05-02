"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { GitHubConnectCard } from "@/components/github/GithubConnectCard";
import { RepoPicker } from "@/components/github/RepoPicker";
import { useGithubStatus } from "@/lib/hooks/useGithubStatus";
import { apiRequest, ApiError } from "@/lib/api";
import type { GithubRepo } from "@/lib/api-github";
import type { Deployment } from "@/lib/types/dashboard";

type EnvVar = { key: string; value: string };

const frameworkOptions = [
  { label: "Next.js", icon: "▲", value: "nextjs" },
  { label: "React Vite", icon: "⚡", value: "react" },
  { label: "Node.js", icon: "⬡", value: "express" },
  { label: "Python", icon: "🐍", value: "fastapi" },
] as const;

type FrameworkValue = (typeof frameworkOptions)[number]["value"];

const frameworkDefaults: Record<
  FrameworkValue,
  {
    installCommand: string;
    buildCommand: string;
    outputDirectory: string;
    startCommand: string;
  }
> = {
  nextjs: {
    installCommand: "npm install",
    buildCommand: "npm run build",
    outputDirectory: ".next",
    startCommand: "npm start",
  },
  react: {
    installCommand: "npm install",
    buildCommand: "npm run build",
    outputDirectory: "dist",
    startCommand: "npm run preview",
  },
  express: {
    installCommand: "npm install",
    buildCommand: "npm run build",
    outputDirectory: "dist",
    startCommand: "node dist/index.js",
  },
  fastapi: {
    installCommand: "pip install -r requirements.txt",
    buildCommand: "",
    outputDirectory: ".",
    startCommand: "uvicorn main:app --host 0.0.0.0 --port 8000",
  },
};

type DeployMode = "github" | "manual";

export default function NewProjectPage() {
  const router = useRouter();
  const { status: githubStatus, loading: githubLoading } = useGithubStatus();

  const [mode, setMode] = useState<DeployMode>("github");
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buildOpen, setBuildOpen] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);

  const [form, setForm] = useState({
    name: "",
    repoUrl: "",
    repoFullName: "",
    framework: "nextjs" as FrameworkValue,
    branch: "main",
    rootDirectory: "./",
    installCommand: "npm install",
    buildCommand: "npm run build",
    outputDirectory: ".next",
    startCommand: "",
    autoDeploy: false,
  });

  const handleRepoSelect = (repo: GithubRepo | null) => {
    setSelectedRepo(repo);
    if (!repo) {
      setForm((f) => ({
        ...f,
        repoUrl: "",
        repoFullName: "",
        branch: "main",
        name: "",
      }));
      return;
    }
    setForm((f) => ({
      ...f,
      repoUrl: repo.html_url,
      repoFullName: repo.full_name,
      branch: repo.default_branch || "main",
      name: f.name || repo.name,
    }));
  };

  const handleFrameworkChange = (fwValue: FrameworkValue) => {
    const defaults = frameworkDefaults[fwValue];
    setForm((f) => ({
      ...f,
      framework: fwValue,
      installCommand: defaults.installCommand,
      buildCommand: defaults.buildCommand,
      outputDirectory: defaults.outputDirectory,
      startCommand: defaults.startCommand,
    }));
  };

  const onSubmit = async () => {
    setError(null);

    // Validate
    if (!form.name.trim()) return setError("Project name is required");
    if (mode === "github" && !selectedRepo)
      return setError("Please select a repository");
    if (mode === "manual" && !form.repoUrl.trim())
      return setError("Repository URL is required");

    setLoading(true);
    try {
      const project = await apiRequest<{ _id: string }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          repoUrl: form.repoUrl,
          framework: form.framework,
          branch: form.branch,
          rootDirectory: form.rootDirectory,
          installCommand: form.installCommand,
          buildCommand: form.buildCommand,
          outputDirectory: form.outputDirectory,
          startCommand: form.startCommand,
          autoDeploy: form.autoDeploy,
          trackedBranch: form.branch,
          repoSource: mode,
          repoFullName: mode === "github" ? form.repoFullName : undefined,
          envVars: envVars.filter((v) => v.key.trim().length > 0),
        }),
      });

      const deployment = await apiRequest<Deployment>(
        `/api/projects/${project._id}/deploy`,
        { method: "POST" },
      );

      if (deployment?._id)
        router.push(`/dashboard/deployments/${deployment._id}`);
      else router.push("/dashboard/projects");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  const isGithubConnected = !githubLoading && githubStatus?.connected;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar />

      <main className="ml-64 flex-1 p-8">
        <div className="max-w-2xl mx-auto">
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
              Connect a repository and configure your deployment
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle
                  cx="8"
                  cy="8"
                  r="7"
                  stroke="#EF4444"
                  strokeWidth="1.5"
                />
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

          <div className="space-y-6">
            {/* Mode tabs */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
              <button
                onClick={() => setMode("github")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === "github"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <GithubIcon className="w-4 h-4" />
                Import from GitHub
              </button>
              <button
                onClick={() => setMode("manual")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === "manual"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Deploy public repo
              </button>
            </div>

            {/* GitHub Connection & Repo Picker */}
            {mode === "github" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    GitHub Account
                  </label>
                  <GitHubConnectCard compact />
                </div>

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

                {!githubLoading && !isGithubConnected && (
                  <div className="py-6 text-center text-sm text-gray-500">
                    Connect your GitHub account above to import repositories.
                  </div>
                )}
              </div>
            )}

            {/* Manual mode */}
            {mode === "manual" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <svg
                    className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-xs text-amber-700">
                    Manual mode is for public repositories. For private repos,
                    use GitHub import above.
                  </p>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-gray-700">
                    Repository URL <span className="text-violet-500">*</span>
                  </span>
                  <input
                    className="w-full h-11 rounded-lg border border-gray-200 px-3.5 text-sm text-gray-900 font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all placeholder:text-gray-400"
                    placeholder="https://github.com/owner/repo"
                    value={form.repoUrl}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, repoUrl: v.target.value }))
                    }
                    required
                  />
                </label>
              </div>
            )}

            {/* Project Details - shown after repo selection or in manual mode */}
            {(selectedRepo || mode === "manual") && (
              <>
                {/* Project Details */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">
                    Project details
                  </h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-gray-700">
                          Project name{" "}
                          <span className="text-violet-500">*</span>
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
                  </div>
                </div>

                {/* Framework */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">
                    Framework
                  </h2>
                  <div className="grid grid-cols-4 gap-2">
                    {frameworkOptions.map((fw) => (
                      <button
                        key={fw.value}
                        type="button"
                        onClick={() => handleFrameworkChange(fw.value)}
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

                {/* Build & Output Settings */}
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
                      <div className="grid grid-cols-2 gap-4">
                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-gray-500">
                            Root directory
                          </span>
                          <input
                            className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all"
                            value={form.rootDirectory}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                rootDirectory: e.target.value,
                              }))
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
                              setForm((f) => ({
                                ...f,
                                installCommand: e.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-gray-500">
                            Build command
                          </span>
                          <input
                            className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all"
                            value={form.buildCommand}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                buildCommand: e.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-gray-500">
                            Output directory
                          </span>
                          <input
                            className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all"
                            value={form.outputDirectory}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                outputDirectory: e.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-gray-500">
                          Start command
                        </span>
                        <input
                          className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 font-mono outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all"
                          value={form.startCommand}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              startCommand: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer pt-2">
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
                                  i === idx
                                    ? { ...entry, key: e.target.value }
                                    : entry,
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
                              setEnvVars((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
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
                          setEnvVars((prev) => [
                            ...prev,
                            { key: "", value: "" },
                          ])
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
                    onClick={onSubmit}
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
              </>
            )}
          </div>
        </div>
      </main>
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
