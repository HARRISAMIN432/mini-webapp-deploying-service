"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../api";

export type LogLevel = "info" | "success" | "warn" | "error" | "cmd" | "system";

export interface LogLine {
  id: string;
  timestamp: Date;
  level: LogLevel;
  projectName: string;
  deploymentId: string;
  text: string;
}

export interface DeploymentLogState {
  lines: LogLine[];
  isConnected: boolean;
  isReconnecting: boolean;
  error: string | null;
  activeDeploymentId: string | null;
}

interface UseDeploymentLogsOptions {
  /** SSE endpoint — e.g. /api/projects/deployments/logs/stream */
  streamUrl: string;
  /** Fallback poll endpoint — e.g. /api/projects/deployments */
  pollUrl: string;
  /** How often to poll for new deployments when SSE is unavailable (ms) */
  pollIntervalMs?: number;
  /** Max lines to keep in memory */
  maxLines?: number;
}

const RECONNECT_BASE_MS = 1_500;
const RECONNECT_MAX_MS = 30_000;
const DEFAULT_POLL_MS = 4_000;
const DEFAULT_MAX_LINES = 500;

function classifyLine(text: string): LogLevel {
  const t = text.toLowerCase();
  if (t.includes("error") || t.includes("failed") || t.includes("✗"))
    return "error";
  if (t.includes("warn") || t.includes("warning")) return "warn";
  if (t.includes("✓") || t.includes("success") || t.includes("complete"))
    return "success";
  if (t.startsWith("$") || t.startsWith(">")) return "cmd";
  if (t.includes("→") || t.includes("↑") || t.includes("deploying"))
    return "info";
  return "system";
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useDeploymentLogs({
  streamUrl,
  pollUrl,
  pollIntervalMs = DEFAULT_POLL_MS,
  maxLines = DEFAULT_MAX_LINES,
}: UseDeploymentLogsOptions): DeploymentLogState & {
  clearLogs: () => void;
  reconnect: () => void;
} {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDeploymentId, setActiveDeploymentId] = useState<string | null>(
    null,
  );

  const esRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const pushLines = useCallback(
    (incoming: LogLine[]) => {
      if (!mountedRef.current) return;
      setLines((prev) => {
        const next = [...prev, ...incoming];
        return next.length > maxLines ? next.slice(-maxLines) : next;
      });
    },
    [maxLines],
  );

  const clearLogs = useCallback(() => setLines([]), []);

  // ── SSE connection ────────────────────────────────────────────────────────
  const connectSSE = useCallback(() => {
    if (!mountedRef.current) return;
    esRef.current?.close();
    setIsReconnecting(reconnectAttemptsRef.current > 0);

    // Bearer token can't go in EventSource headers — pass as query param
    const token = localStorage.getItem("shipstack_access_token");
    const url = `${streamUrl}${token ? `?token=${encodeURIComponent(token)}` : ""}`;

    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => {
      if (!mountedRef.current) return;
      setIsConnected(true);
      setIsReconnecting(false);
      setError(null);
      reconnectAttemptsRef.current = 0;
      // Stop polling once SSE is live
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    // Generic "log" events
    es.addEventListener("log", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as {
          deploymentId: string;
          projectName: string;
          text: string;
          level?: LogLevel;
          timestamp?: string;
        };
        setActiveDeploymentId(payload.deploymentId);
        pushLines([
          {
            id: makeId(),
            timestamp: payload.timestamp
              ? new Date(payload.timestamp)
              : new Date(),
            level: payload.level ?? classifyLine(payload.text),
            projectName: payload.projectName,
            deploymentId: payload.deploymentId,
            text: payload.text,
          },
        ]);
      } catch {
        // malformed event — ignore
      }
    });

    // Deployment lifecycle events
    es.addEventListener("deployment:start", (e: MessageEvent) => {
      try {
        const { deploymentId, projectName } = JSON.parse(e.data);
        setActiveDeploymentId(deploymentId);
        // ← Clear old logs so the new deployment starts with a clean terminal
        setLines([]);
        pushLines([
          {
            id: makeId(),
            timestamp: new Date(),
            level: "system",
            projectName,
            deploymentId,
            text: `▶ Deployment ${deploymentId} started`,
          },
        ]);
      } catch {
        /* ignore */
      }
    });

    es.addEventListener("deployment:end", (e: MessageEvent) => {
      try {
        const { deploymentId, projectName, status } = JSON.parse(e.data);
        pushLines([
          {
            id: makeId(),
            timestamp: new Date(),
            level: status === "success" ? "success" : "error",
            projectName,
            deploymentId,
            text:
              status === "success"
                ? `✓ Deployment ${deploymentId} completed successfully`
                : `✗ Deployment ${deploymentId} failed`,
          },
        ]);
      } catch {
        /* ignore */
      }
    });

    es.onerror = () => {
      if (!mountedRef.current) return;
      es.close();
      setIsConnected(false);

      const attempt = reconnectAttemptsRef.current++;
      const delay = Math.min(
        RECONNECT_BASE_MS * 2 ** attempt,
        RECONNECT_MAX_MS,
      );

      setIsReconnecting(true);
      setError(
        `Connection lost. Reconnecting in ${Math.round(delay / 1000)}s…`,
      );

      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connectSSE();
      }, delay);

      // Fall back to polling while SSE is down
      startPolling();
    };
  }, [streamUrl, pushLines]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Polling fallback ──────────────────────────────────────────────────────
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return; // already polling

    const fetchLogs = async () => {
      try {
        const deployments = await apiRequest<
          Array<{
            // Mongoose virtualises _id → id, but raw lean() docs may only have _id
            id?: string;
            _id?: string;
            createdAt: string;
            logs: string[];
            projectId: string | { name: string };
          }>
        >(pollUrl);

        const incoming: LogLine[] = deployments.slice(0, 8).flatMap((d) => {
          // Normalise id: Mongoose virtual gives id, lean/raw gives _id
          const deploymentId = d.id ?? (d._id as string) ?? makeId();
          return d.logs.map((text, i) => ({
            id: `poll-${deploymentId}-${i}`,
            timestamp: new Date(d.createdAt),
            level: classifyLine(text),
            projectName:
              typeof d.projectId === "string" ? d.projectId : d.projectId?.name,
            deploymentId,
            text,
          }));
        });

        // Replace poll-sourced lines only; don't clobber lines already
        // delivered via SSE (which have non-poll ids).
        setLines((prev) => {
          const sseLines = prev.filter((l) => !l.id.startsWith("poll-"));
          if (sseLines.length > 0) {
            // SSE is delivering real-time data — polling is just a fallback,
            // discard stale poll results.
            return sseLines;
          }
          // Pure polling mode: replace wholesale so we always show latest.
          return incoming;
        });

        if (incoming[0]) setActiveDeploymentId(incoming[0].deploymentId);
        setError(null);
      } catch {
        /* ignore poll errors silently */
      }
    };

    fetchLogs();
    pollTimerRef.current = setInterval(fetchLogs, pollIntervalMs);
  }, [pollUrl, pollIntervalMs]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    // Try SSE first; polling kicks in automatically on SSE error
    connectSSE();

    return () => {
      mountedRef.current = false;
      esRef.current?.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [connectSSE]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    connectSSE();
  }, [connectSSE]);

  return {
    lines,
    isConnected,
    isReconnecting,
    error,
    activeDeploymentId,
    clearLogs,
    reconnect,
  };
}
