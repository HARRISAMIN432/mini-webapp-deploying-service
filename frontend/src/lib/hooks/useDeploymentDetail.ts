"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DeploymentStatus =
  | "queued"
  | "cloning"
  | "building"
  | "starting"
  | "running"
  | "failed"
  | "stopped";

export interface LogLine {
  id: string;
  text: string;
  timestamp: number;
  deploymentId: string;
}

export interface DeploymentState {
  status: DeploymentStatus | null;
  publicUrl: string | null;
  errorMessage: string | null;
  commitHash: string | null;
}

interface UseDeploymentDetailOptions {
  deploymentId: string;
  streamBaseUrl: string;
  token: string | null;
  maxLines?: number;
}

interface UseDeploymentDetailResult {
  lines: LogLine[];
  deployment: DeploymentState;
  isConnected: boolean;
  isReconnecting: boolean;
  replayDone: boolean;
  clearLogs: () => void;
  reconnect: () => void;
}

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export function useDeploymentDetail({
  deploymentId,
  streamBaseUrl,
  token,
  maxLines = 500,
}: UseDeploymentDetailOptions): UseDeploymentDetailResult {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [deployment, setDeployment] = useState<DeploymentState>({
    status: null,
    publicUrl: null,
    errorMessage: null,
    commitHash: null,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [replayDone, setReplayDone] = useState(false);

  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!token || !deploymentId) return;

    esRef.current?.close();

    const url = `${streamBaseUrl}?token=${encodeURIComponent(token)}&deploymentId=${encodeURIComponent(deploymentId)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      if (!mountedRef.current) return;
      setIsConnected(true);
      setIsReconnecting(false);
      attemptsRef.current = 0;
    };

    es.addEventListener("log", (e: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const entry = JSON.parse(e.data) as LogLine;
        setLines((prev) => {
          // Deduplicate by id
          if (prev.some((l) => l.id === entry.id)) return prev;
          const next = [...prev, entry];
          return next.length > maxLines ? next.slice(-maxLines) : next;
        });
      } catch {
        /* ignore malformed */
      }
    });

    es.addEventListener("status", (e: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(e.data);
        setDeployment((prev) => ({
          status: data.status ?? prev.status,
          publicUrl: data.publicUrl ?? prev.publicUrl,
          errorMessage: data.errorMessage ?? prev.errorMessage,
          commitHash: data.commitHash ?? prev.commitHash,
        }));
      } catch {
        /* ignore */
      }
    });

    es.addEventListener("replay_done", () => {
      if (!mountedRef.current) return;
      setReplayDone(true);
    });

    es.onerror = () => {
      if (!mountedRef.current) return;
      es.close();
      setIsConnected(false);

      if (attemptsRef.current >= MAX_RECONNECT_ATTEMPTS) return;

      setIsReconnecting(true);
      attemptsRef.current += 1;
      const delay = Math.min(
        RECONNECT_DELAY_MS * Math.pow(1.5, attemptsRef.current - 1),
        30_000,
      );
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };
  }, [deploymentId, streamBaseUrl, token, maxLines]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      esRef.current?.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [connect]);

  const clearLogs = useCallback(() => setLines([]), []);
  const reconnect = useCallback(() => {
    attemptsRef.current = 0;
    setIsReconnecting(false);
    connect();
  }, [connect]);

  return {
    lines,
    deployment,
    isConnected,
    isReconnecting,
    replayDone,
    clearLogs,
    reconnect,
  };
}
