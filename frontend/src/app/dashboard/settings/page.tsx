"use client";

import { GitHubConnectCard } from "@/components/github/GithubConnectCard";
import { useGithubStatus } from "@/lib/hooks/useGithubStatus";

function GitHubSection() {
    const { status, loading, refetch } = useGithubStatus();

    return (
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">GitHub</h2>
                        <p className="text-xs text-gray-500">
                            Connect GitHub to import and deploy your repositories
                        </p>
                    </div>
                    {/* Status pill */}
                    {!loading && (
                        <div className="ml-auto">
                            {status?.connected ? (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    Connected
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                    Not connected
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="p-6">
                <GitHubConnectCard onStatusChange={refetch} />

                {status?.connected && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <InfoTile
                            label="GitHub Account"
                            value={`@${status.githubLogin}`}
                        />
                        <InfoTile
                            label="Connected"
                            value={
                                status.connectedAt
                                    ? new Date(status.connectedAt).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })
                                    : "—"
                            }
                        />
                    </div>
                )}

                <p className="mt-4 text-xs text-gray-400">
                    ShipStack requests read access to your repositories and your email.
                    Your GitHub token is encrypted at rest and never exposed to the
                    browser.
                </p>
            </div>
        </section>
    );
}

function InfoTile({ label, value }: { label: string; value: string }) {
    return (
        <div className="px-3 py-2.5 bg-gray-50 rounded-lg">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {label}
            </p>
            <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">{value}</p>
        </div>
    );
}

export default GitHubSection