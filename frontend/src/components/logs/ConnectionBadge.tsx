interface ConnectionBadgeProps {
  isConnected: boolean;
  isReconnecting: boolean;
  error: string | null;
  onReconnect: () => void;
}

export function ConnectionBadge({
  isConnected,
  isReconnecting,
  error,
  onReconnect,
}: ConnectionBadgeProps) {
  if (isConnected) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{
              background: "#4ade80",
              animation: "ping 1.2s cubic-bezier(0,0,0.2,1) infinite",
            }}
          />
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ background: "#4ade80" }}
          />
        </span>
        <span
          style={{
            color: "#4ade80",
            fontSize: "11px",
            fontFamily: "'DM Mono', monospace",
            letterSpacing: "0.06em",
          }}
        >
          LIVE
        </span>
      </div>
    );
  }

  if (isReconnecting) {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{
            background: "#fbbf24",
            animation: "pulse 1s ease-in-out infinite",
          }}
        />
        <span
          style={{
            color: "#fbbf24",
            fontSize: "11px",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {error ?? "RECONNECTING…"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: "#f87171" }}
      />
      <span
        style={{
          color: "#f87171",
          fontSize: "11px",
          fontFamily: "'DM Mono', monospace",
        }}
      >
        DISCONNECTED
      </span>
      <button
        onClick={onReconnect}
        className="ml-1 rounded px-2 py-0.5 text-[11px] transition-colors"
        style={{
          background: "rgba(248,113,113,0.15)",
          color: "#f87171",
          border: "1px solid rgba(248,113,113,0.3)",
          fontFamily: "'DM Mono', monospace",
          cursor: "pointer",
        }}
      >
        retry
      </button>
    </div>
  );
}
