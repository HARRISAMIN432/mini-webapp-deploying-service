"use client";

/**
 * components/GitHubConnectCard.tsx  (Phase 6)
 *
 * Shows GitHub connection status. If not connected, shows a connect button.
 * If connected, shows the GitHub username + disconnect option.
 *
 * Used on the dashboard settings page and inside the create-project flow.
 */

import { getOAuthStartUrl } from "@/lib/api";
import { useGithubStatus } from "@/lib/hooks/useGithubStatus";

interface GitHubConnectCardProps {
    /** When used inline (e.g. in the repo picker), show a compact version */
    compact?: boolean;
    /** Called after connect/disconnect so parent can react */
    onStatusChange?: () => void;
}

export function GitHubConnectCard({
    compact = false,
    onStatusChange,
}: GitHubConnectCardProps) {
    const { status, loading, disconnect, disconnecting } = useGithubStatus();

    const handleConnect = () => {
        // Redirect to GitHub OAuth; after callback the token is saved server-side
        window.location.href = getOAuthStartUrl("github", "/auth/callback");
    };

    const handleDisconnect = async () => {
        await disconnect();
        onStatusChange?.();
    };

    if (loading) {
        return (
            <div
                className={`flex items-center gap-3 ${compact ? "px-3 py-2" : "p-4 border border-gray-100 rounded-xl"} bg-gray-50 animate-pulse`}
            >
                <div className="w-5 h-5 rounded-full bg-gray-200" />
                <div className="h-3 bg-gray-200 rounded w-32" />
            </div>
        );
    }

    if (status?.connected) {
        if (compact) {
            return (
                <div className="flex items-center justify-between gap-3 px-3 py-2 bg-green-50 border border-green-100 rounded-lg">
                    <div className="flex items-center gap-2">
                        {status.avatarUrl ? (
                            <img
                                src={status.avatarUrl}
                                alt={status.githubLogin}
                                className="w-5 h-5 rounded-full ring-1 ring-green-200"
                            />
                        ) : (
                            <GithubIcon className="w-4 h-4 text-gray-700" />
                        )}
                        <span className="text-sm font-medium text-green-800">
                            {status.githubLogin}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-green-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                            Connected
                        </span>
                    </div>
                    <button
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                        {disconnecting ? "Disconnecting…" : "Disconnect"}
                    </button>
                </div>
            );
        }

        return (
            <div className="flex items-center justify-between p-4 border border-green-100 bg-green-50/50 rounded-xl">
                <div className="flex items-center gap-3">
                    {status.avatarUrl ? (
                        <img
                            src={status.avatarUrl}
                            alt={status.githubLogin}
                            className="w-9 h-9 rounded-full ring-2 ring-green-200"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center">
                            <GithubIcon className="w-5 h-5 text-white" />
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-semibold text-gray-900">
                            {status.githubLogin}
                        </p>
                        <p className="text-xs text-green-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                            GitHub Connected
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="text-sm text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                    {disconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
            </div>
        );
    }

    // Not connected
    if (compact) {
        return (
            <button
                onClick={handleConnect}
                className="flex items-center gap-2 px-3 py-2 w-full text-sm font-medium bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors"
            >
                <GithubIcon className="w-4 h-4" />
                Connect GitHub to import repositories
            </button>
        );
    }

    return (
        <div className="p-5 border border-dashed border-gray-200 rounded-xl bg-white text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center">
                <GithubIcon className="w-6 h-6 text-white" />
            </div>
            <div>
                <p className="font-semibold text-gray-900 text-sm">
                    Connect your GitHub account
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    Import repositories directly from GitHub with secure OAuth
                </p>
            </div>
            <button
                onClick={handleConnect}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
            >
                <GithubIcon className="w-4 h-4" />
                Connect GitHub
            </button>
        </div>
    );
}

// Inline GitHub icon SVG (no external deps)
function GithubIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
        </svg>
    );
}