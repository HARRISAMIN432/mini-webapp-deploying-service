"use client";

import { useState } from "react";
import { envApi } from "@/lib/api";
import type { MaskedEnvVar } from "@/lib/api";

interface EnvTableProps {
  projectId: string;
  initialVars: MaskedEnvVar[];
  onChanged?: () => void;
}

export function EnvTable({ projectId, initialVars, onChanged }: EnvTableProps) {
  const [vars, setVars] = useState<MaskedEnvVar[]>(initialVars);
  const [adding, setAdding] = useState(false);
  const [newVar, setNewVar] = useState({ key: "", value: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
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
      {changed && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#D97706"
            strokeWidth="2"
          >
            <path d="m10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-sm text-amber-700">
            Changes will apply after redeployment.
          </span>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div
          className="grid px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-400 uppercase tracking-wider"
          style={{ gridTemplateColumns: "1fr 1fr 100px" }}
        >
          <span>Key</span>
          <span>Value</span>
          <span>Actions</span>
        </div>

        {vars.length === 0 && !adding && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-500">
              No environment variables yet.
            </p>
          </div>
        )}

        {vars.map((v, i) => {
          const isEditing = editing === v.key;
          const isLoading = loading === v.key;
          return (
            <div
              key={v.key}
              className={`grid px-5 py-3.5 items-center gap-3 hover:bg-gray-50/60 transition-colors ${
                i < vars.length - 1 || adding ? "border-b border-gray-100" : ""
              }`}
              style={{ gridTemplateColumns: "1fr 1fr 100px" }}
            >
              <span className="text-sm font-mono font-semibold text-gray-800">
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
                  className="bg-white border border-violet-300 rounded-lg px-2.5 py-1.5 text-sm font-mono text-gray-900 outline-none focus:ring-2 focus:ring-violet-100"
                  placeholder="new value"
                />
              ) : (
                <span className="text-sm font-mono text-gray-400 tracking-widest">
                  {v.maskedValue}
                </span>
              )}

              <div className="flex items-center gap-1.5">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => handleUpdate(v.key)}
                      disabled={isLoading}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-gray-900 hover:bg-gray-700 text-white transition-colors disabled:opacity-50"
                    >
                      {isLoading ? "…" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditing(v.key);
                        setEditValue("");
                      }}
                      disabled={!!loading}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-all disabled:opacity-40"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(v.key)}
                      disabled={isLoading}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all disabled:opacity-40"
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
            className="grid px-5 py-3.5 items-center gap-3 border-t border-gray-100 bg-gray-50/50"
            style={{ gridTemplateColumns: "1fr 1fr 100px" }}
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
              className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-mono text-gray-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 placeholder:text-gray-300 transition-all"
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
              className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-mono text-gray-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 placeholder:text-gray-300 transition-all"
            />
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleAdd}
                disabled={loading === "__add__" || !newVar.key.trim()}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-gray-900 hover:bg-gray-700 text-white transition-colors disabled:opacity-50"
              >
                {loading === "__add__" ? "…" : "Add"}
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setNewVar({ key: "", value: "" });
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-400 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/50 transition-all"
        >
          + Add variable
        </button>
      )}
    </div>
  );
}
