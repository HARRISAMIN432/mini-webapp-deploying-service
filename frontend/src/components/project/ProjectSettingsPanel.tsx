"use client";

import { useState } from "react";
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

  const set =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

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

  const field = (
    label: string,
    key: keyof typeof form,
    placeholder?: string,
    mono = true,
  ) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <input
        value={form[key] as string}
        onChange={set(key as any)}
        placeholder={placeholder}
        className={`w-full bg-[#060d1a] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-[13px] ${mono ? "font-mono" : ""} text-white outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-700`}
      />
    </label>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-2.5 text-xs text-red-300">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-2.5 text-xs text-emerald-400">
          ✓ Settings saved
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field("Project name", "name", "my-app", false)}
        {field("Branch", "branch", "main")}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field("Install command", "installCommand", "npm install")}
        {field("Build command", "buildCommand", "npm run build")}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field("Start command", "startCommand", "npm start (optional)")}
        {field("Root directory", "rootDirectory", "./")}
      </div>

      {/* Auto-deploy toggle */}
      <div className="bg-[#060d1a] border border-[#1e293b] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-slate-300">Auto Deploy</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Trigger deployments from GitHub push events
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setForm((f) => ({ ...f, autoDeploy: !f.autoDeploy }))
            }
            className={`relative w-10 h-5 rounded-full transition-colors ${form.autoDeploy ? "bg-indigo-600" : "bg-slate-700"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.autoDeploy ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>
        {form.autoDeploy && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-slate-500">
              Watched branch
            </span>
            <input
              value={form.trackedBranch}
              onChange={set("trackedBranch")}
              placeholder="main"
              className="w-full bg-[#0c1425] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] font-mono text-white outline-none focus:border-indigo-500/50 transition-colors"
            />
          </label>
        )}
      </div>

      {/* Webhook info */}
      {form.autoDeploy && (
        <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/5 px-4 py-3">
          <p className="text-[11px] font-semibold text-indigo-400 mb-1">
            GitHub Webhook URL
          </p>
          <code className="text-[11px] font-mono text-slate-400">
            {typeof window !== "undefined"
              ? window.location.origin.replace(/:\d+/, ":3001")
              : "http://localhost:3001"}
            /api/webhooks/github
          </code>
          <p className="text-[10px] text-slate-600 mt-1.5">
            Add this as a Webhook in your GitHub repo settings (Content type:
            application/json). Optionally set{" "}
            <code className="text-slate-500">GITHUB_WEBHOOK_SECRET</code> on the
            server.
          </p>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(99,102,241,0.3)] disabled:opacity-60 active:translate-y-0"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
