"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useDeploymentLogs } from "@/lib/hooks/usedeploymentlogs";
import { TerminalLineRow } from "@/components/logs/TerminalLineRow";
import { ConnectionBadge } from "@/components/logs/ConnectionBadge";

const STREAM_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/projects/deployments/logs/stream`;
const POLL_URL = "/api/projects/deployments";

export default function LogsPage() {
  const { lines, isConnected, isReconnecting, error, clearLogs, reconnect } =
    useDeploymentLogs({
      streamUrl: STREAM_URL,
      pollUrl: POLL_URL,
      pollIntervalMs: 4_000,
      maxLines: 500,
    });

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const prevLinesLenRef = useRef(0);

  // Track which line IDs are "new" so we can animate them
  const newLineIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (lines.length > prevLinesLenRef.current) {
      const incoming = lines.slice(prevLinesLenRef.current);
      incoming.forEach((l) => newLineIdsRef.current.add(l.id));
      // Clear "new" flag after animation
      const t = setTimeout(() => {
        incoming.forEach((l) => newLineIdsRef.current.delete(l.id));
      }, 400);
      prevLinesLenRef.current = lines.length;
      return () => clearTimeout(t);
    }
    prevLinesLenRef.current = lines.length;
  }, [lines]);

  // Auto-scroll to bottom when new lines arrive
  useLayoutEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [lines, autoScroll]);

  // Detect manual scroll-up → disable auto-scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(distFromBottom < 40);
  }, []);

  const scrollToBottom = useCallback(() => {
    setAutoScroll(true);
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  const isEmpty = lines.length === 0;

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <h2
          className="text-3xl font-bold text-white"
          style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}
        >
          Logs
        </h2>

        {/* Right-side controls */}
        <div className="flex items-center gap-3">
          <ConnectionBadge
            isConnected={isConnected}
            isReconnecting={isReconnecting}
            error={error}
            onReconnect={reconnect}
          />
          <button
            onClick={clearLogs}
            className="rounded-lg px-3 py-1.5 text-xs transition-colors"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#6b7280",
              fontFamily: "'DM Mono', monospace",
              cursor: "pointer",
            }}
          >
            clear
          </button>
        </div>
      </div>

      {/* ── Terminal window ── */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          border: "1px solid rgba(99,102,241,0.2)",
          background: "#070810",
          boxShadow: "0 0 60px rgba(99,102,241,0.07)",
        }}
      >
        {/* Glow overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 30% at 50% 0%, rgba(99,102,241,0.12), transparent 70%)",
          }}
        />

        {/* ── Terminal top bar ── */}
        <div
          className="relative flex items-center justify-between px-4 py-3"
          style={{
            background: "#0d0f1a",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Traffic lights */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <div className="h-3 w-3 rounded-full bg-green-500/80" />
            </div>
            <span
              style={{
                color: "#374151",
                fontSize: "12px",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              deployment — build terminal
            </span>
          </div>

          {/* Line count */}
          {!isEmpty && (
            <span
              style={{
                color: "#374151",
                fontSize: "11px",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {lines.length} line{lines.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* ── Log output ── */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative overflow-auto px-3 py-4"
          style={{ maxHeight: "560px", minHeight: "200px" }}
        >
          {isEmpty ? (
            <EmptyState
              isConnected={isConnected}
              isReconnecting={isReconnecting}
            />
          ) : (
            <>
              {lines.map((line) => (
                <TerminalLineRow
                  key={line.id}
                  line={line}
                  isNew={newLineIdsRef.current.has(line.id)}
                />
              ))}
            </>
          )}

          {/* Blinking cursor */}
          {!isEmpty && (
            <span
              className="ml-2 inline-block h-3.5 w-1.5 align-middle"
              style={{
                background: "#818cf8",
                animation: "blink-cur 1s step-start infinite",
              }}
            />
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Scroll-to-bottom pill ── */}
        {!autoScroll && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs backdrop-blur transition-all"
            style={{
              background: "rgba(99,102,241,0.25)",
              border: "1px solid rgba(99,102,241,0.4)",
              color: "#818cf8",
              fontFamily: "'DM Mono', monospace",
              cursor: "pointer",
            }}
          >
            ↓ jump to latest
          </button>
        )}
      </div>

      {/* ── CSS keyframes ── */}
      <style jsx global>{`
        @keyframes blink-cur {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
        @keyframes log-enter {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes ping {
          75%,
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Empty / waiting state ────────────────────────────────────────────────────
function EmptyState({
  isConnected,
  isReconnecting,
}: {
  isConnected: boolean;
  isReconnecting: boolean;
}) {
  return (
    <div
      className="flex flex-col items-start justify-center gap-1"
      style={{ fontFamily: "'DM Mono', monospace", fontSize: "13px" }}
    >
      <span style={{ color: "#374151" }}>
        $ waiting for deployment logs
        <span style={{ animation: "blink-cur 1s step-start infinite" }}>_</span>
      </span>
      {isReconnecting && (
        <span style={{ color: "#fbbf24" }}>⟳ reconnecting to log stream…</span>
      )}
      {!isConnected && !isReconnecting && (
        <span style={{ color: "#f87171" }}>
          ✗ stream offline — using polling fallback
        </span>
      )}
    </div>
  );
}
