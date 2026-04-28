"use client";

import { useState, useCallback } from "react";
import { projectApi } from "@/lib/api";

interface ProjectSettingsPanelProps {
  projectId: string;
  initial: {
    name: string;
    buildCommand: string;
    installCommand: string;
    startCommand: string;
    rootDirectory: string;
    branch: string;
    autoDeploy: boolean;
    trackedBranch: string;
  };
  onSaved?: () => void;
}

export function ProjectSettingsPanel({
  projectId,
  initial,
  onSaved,
}: ProjectSettingsPanelProps) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use useCallback to memoize the handler
  const handleChange = useCallback(
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
    },
    [], // No dependencies needed since setForm is stable
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await projectApi.updateSettings(projectId, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="#16A34A" strokeWidth="1.5" />
            <path
              d="M4.5 7L6.5 9L9.5 5"
              stroke="#16A34A"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Settings saved successfully
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-500">Project name</span>
          <input
            value={form.name}
            onChange={handleChange("name")}
            placeholder="my-app"
            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-300"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-500">Branch</span>
          <input
            value={form.branch}
            onChange={handleChange("branch")}
            placeholder="main"
            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-gray-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-300"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-500">Install command</span>
          <input
            value={form.installCommand}
            onChange={handleChange("installCommand")}
            placeholder="npm install"
            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-gray-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-300"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-500">Build command</span>
          <input
            value={form.buildCommand}
            onChange={handleChange("buildCommand")}
            placeholder="npm run build"
            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-gray-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-300"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-500">Start command</span>
          <input
            value={form.startCommand}
            onChange={handleChange("startCommand")}
            placeholder="npm start (optional)"
            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-gray-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-300"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-500">Root directory</span>
          <input
            value={form.rootDirectory}
            onChange={handleChange("rootDirectory")}
            placeholder="./"
            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-gray-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-300"
          />
        </label>
      </div>

      {/* Auto-deploy toggle */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Auto Deploy</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Trigger deployments from GitHub push events
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setForm((f) => ({ ...f, autoDeploy: !f.autoDeploy }))
            }
            className={`relative w-11 h-6 rounded-full transition-colors ${form.autoDeploy ? "bg-gray-900" : "bg-gray-300"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form.autoDeploy ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>
        {form.autoDeploy && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-gray-500">
              Watched branch
            </span>
            <input
              value={form.trackedBranch}
              onChange={handleChange("trackedBranch")}
              placeholder="main"
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all"
            />
          </label>
        )}
      </div>

      {/* Webhook info */}
      {form.autoDeploy && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-4">
          <p className="text-xs font-semibold text-violet-700 mb-1.5">
            GitHub Webhook URL
          </p>
          <code className="text-xs font-mono text-violet-600 break-all">
            {typeof window !== "undefined"
              ? window.location.origin.replace(/:\d+/, ":3001")
              : "http://localhost:3001"}
            /api/webhooks/github
          </code>
          <p className="text-xs text-violet-500 mt-2 leading-relaxed">
            Add this as a Webhook in your GitHub repo settings (Content type:
            application/json). Optionally set{" "}
            <code className="text-violet-700">GITHUB_WEBHOOK_SECRET</code> on
            the server.
          </p>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-gray-900 hover:bg-gray-700 text-white transition-all disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
      </div>
    </form>
  );
}