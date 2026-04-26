"use client";

import { useState } from "react";
import { envApi } from "@/lib/api";
import type { MaskedEnvVar } from "@/lib/api";

interface EnvTableProps {
  projectId: string;
  initialVars: MaskedEnvVar[];
  onChanged?: () => void; // notify parent that a redeploy is needed
}

interface EditingState {
  key: string;
  value: string;
}

export function EnvTable({ projectId, initialVars, onChanged }: EnvTableProps) {
  const [vars, setVars] = useState<MaskedEnvVar[]>(initialVars);
  const [adding, setAdding] = useState(false);
  const [newVar, setNewVar] = useState({ key: "", value: "" });
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState<string | null>(null); // tracks which key is loading
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  const handleError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : "Something went wrong";
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };

  const markChanged = () => {
    setChanged(true);
    onChanged?.();
  };

  // ─── Add ───────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!newVar.key.trim()) return;
    setLoading("__add__");
    try {
      const updated = await envApi.add(
        projectId,
        newVar.key.trim(),
        newVar.value,
      );
      setVars(updated);
      setNewVar({ key: "", value: "" });
      setAdding(false);
      markChanged();
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(null);
    }
  };

  // ─── Update ────────────────────────────────────────────────────────────────

  const handleUpdate = async (key: string) => {
    setLoading(key);
    try {
      const updated = await envApi.update(projectId, key, editValue);
      setVars(updated);
      setEditing(null);
      markChanged();
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(null);
    }
  };

  // ─── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (key: string) => {
    if (!confirm(`Delete "${key}"? This cannot be undone.`)) return;
    setLoading(key);
    try {
      const updated = await envApi.delete(projectId, key);
      setVars(updated);
      markChanged();
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      {/* Changed notice */}
      {changed && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
          >
            <path d="m10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-xs text-amber-400">
            Changes apply after redeployment
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-2.5 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[#1a2540] overflow-hidden">
        {/* Header */}
        <div
          className="grid px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600 border-b border-[#1a2540] bg-[#080f1e]"
          style={{ gridTemplateColumns: "1fr 1fr 80px" }}
        >
          <span>Key</span>
          <span>Value</span>
          <span>Actions</span>
        </div>

        {/* Rows */}
        {vars.length === 0 && !adding && (
          <div className="px-4 py-8 text-center text-sm text-slate-600">
            No environment variables. Add one below.
          </div>
        )}

        {vars.map((v) => {
          const isEditing = editing?.key === v.key;
          const isLoading = loading === v.key;
          return (
            <div
              key={v.key}
              className="grid px-4 py-3 border-b border-[#111c30] last:border-0 items-center gap-3 group"
              style={{ gridTemplateColumns: "1fr 1fr 80px" }}
            >
              <span className="text-xs font-mono text-slate-300 font-semibold">
                {v.key}
              </span>

              {isEditing ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdate(v.key);
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className="bg-[#0a1020] border border-indigo-500/50 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="new value"
                />
              ) : (
                <span className="text-xs font-mono text-slate-500 tracking-widest">
                  {v.maskedValue}
                </span>
              )}

              <div className="flex items-center gap-1.5">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => handleUpdate(v.key)}
                      disabled={isLoading}
                      className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                    >
                      {isLoading ? "…" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="px-2 py-1 text-[10px] rounded-lg border border-[#1e293b] text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditing({ key: v.key, value: "" });
                        setEditValue("");
                      }}
                      disabled={!!loading}
                      className="px-2 py-1 text-[10px] rounded-lg border border-[#1e293b] text-slate-500 hover:border-indigo-500/40 hover:text-indigo-400 transition-all disabled:opacity-40"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(v.key)}
                      disabled={isLoading}
                      className="px-2 py-1 text-[10px] rounded-lg border border-[#1e293b] text-slate-500 hover:border-red-500/40 hover:text-red-400 transition-all disabled:opacity-40"
                    >
                      {isLoading ? "…" : "Del"}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Add row */}
        {adding && (
          <div
            className="grid px-4 py-3 border-t border-[#111c30] items-center gap-3"
            style={{ gridTemplateColumns: "1fr 1fr 80px" }}
          >
            <input
              autoFocus
              value={newVar.key}
              onChange={(e) =>
                setNewVar((n) => ({ ...n, key: e.target.value.toUpperCase() }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="NEW_KEY"
              className="bg-[#0a1020] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-indigo-500/50 transition-colors"
            />
            <input
              value={newVar.value}
              onChange={(e) =>
                setNewVar((n) => ({ ...n, value: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="value"
              className="bg-[#0a1020] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-indigo-500/50 transition-colors"
            />
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleAdd}
                disabled={loading === "__add__" || !newVar.key.trim()}
                className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
              >
                {loading === "__add__" ? "…" : "Add"}
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setNewVar({ key: "", value: "" });
                }}
                className="px-2 py-1 text-[10px] rounded-lg border border-[#1e293b] text-slate-500 hover:text-slate-300 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add button */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 border border-dashed border-[#1e293b] rounded-xl px-3 py-2.5 text-xs text-slate-600 hover:border-indigo-500/40 hover:text-indigo-400 hover:bg-indigo-500/4 transition-all"
        >
          + Add variable
        </button>
      )}
    </div>
  );
}
