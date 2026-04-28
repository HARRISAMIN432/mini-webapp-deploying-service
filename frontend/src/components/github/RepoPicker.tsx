"use client";

/**
 * components/RepoPicker.tsx  (Phase 6)
 *
 * Repo search + selection UI for the create-project flow.
 * Shows GitHub repos as cards. Selecting one populates the form fields.
 *
 * Props:
 *  onSelect(repo) — called when user picks a repo
 *  selected       — currently selected repo (for highlight)
 */

import { useGithubRepos } from "@/lib/hooks/useGithubRepos";
import type { GithubRepo } from "@/lib/api-github";

interface RepoPickerProps {
    onSelect: (repo: GithubRepo) => void;
    selected: GithubRepo | null;
}

const LANG_COLORS: Record<string, string> = {
    TypeScript: "bg-blue-500",
    JavaScript: "bg-yellow-400",
    Python: "bg-green-500",
    Go: "bg-cyan-500",
    Rust: "bg-orange-600",
    Ruby: "bg-red-500",
    Java: "bg-orange-500",
    "C#": "bg-purple-600",
    PHP: "bg-indigo-500",
    Swift: "bg-orange-400",
    Kotlin: "bg-purple-500",
    Dart: "bg-blue-400",
};

function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
}

export function RepoPicker({ onSelect, selected }: RepoPickerProps) {
    const { repos, loading, loadingMore, error, search, setSearch, hasMore, loadMore } =
        useGithubRepos({ enabled: true });

    return (
        <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
                <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fillRule="evenodd"
                        d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                        clipRule="evenodd"
                    />
                </svg>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search repositories…"
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder-gray-400"
                />
            </div>

            {/* Repo list */}
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-[360px] overflow-y-auto">
                {loading && (
                    <>
                        {[1, 2, 3, 4].map((i) => (
                            <RepoSkeleton key={i} />
                        ))}
                    </>
                )}

                {!loading && error && (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <span className="text-2xl mb-2">⚠️</span>
                        <p className="text-sm font-medium text-gray-700">
                            Failed to load repositories
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{error}</p>
                    </div>
                )}

                {!loading && !error && repos.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <span className="text-2xl mb-2">🔍</span>
                        <p className="text-sm font-medium text-gray-700">
                            No repositories found
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {search
                                ? "Try a different search term"
                                : "Your GitHub account has no repositories yet"}
                        </p>
                    </div>
                )}

                {!loading &&
                    repos.map((repo) => (
                        <RepoCard
                            key={repo.id}
                            repo={repo}
                            selected={selected?.id === repo.id}
                            onSelect={onSelect}
                        />
                    ))}

                {/* Load more */}
                {hasMore && !loading && (
                    <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="w-full py-3 text-sm text-violet-600 hover:text-violet-700 hover:bg-violet-50 transition-colors font-medium"
                    >
                        {loadingMore ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                                Loading…
                            </span>
                        ) : (
                            "Load more repositories"
                        )}
                    </button>
                )}
            </div>

            {selected && (
                <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-100 rounded-lg">
                    <svg
                        className="w-4 h-4 text-violet-500 flex-shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <p className="text-sm text-violet-700 font-medium truncate">
                        {selected.full_name}
                    </p>
                    <button
                        onClick={() => onSelect(null as unknown as GithubRepo)}
                        className="ml-auto text-xs text-violet-400 hover:text-violet-600 flex-shrink-0"
                    >
                        Clear
                    </button>
                </div>
            )}
        </div>
    );
}

function RepoCard({
    repo,
    selected,
    onSelect,
}: {
    repo: GithubRepo;
    selected: boolean;
    onSelect: (r: GithubRepo) => void;
}) {
    const langColor =
        repo.language && LANG_COLORS[repo.language]
            ? LANG_COLORS[repo.language]
            : "bg-gray-400";

    return (
        <button
            onClick={() => onSelect(repo)}
            className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${selected
                ? "bg-violet-50 border-l-2 border-l-violet-500"
                : "hover:bg-gray-50 border-l-2 border-l-transparent"
                }`}
        >
            {/* Repo icon */}
            <div className="mt-0.5 flex-shrink-0">
                {repo.private ? (
                    <svg className="w-4 h-4 text-amber-500" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4 5V3.5A3.5 3.5 0 0 1 11 3.5V5h.5A1.5 1.5 0 0 1 13 6.5v6A1.5 1.5 0 0 1 11.5 14h-7A1.5 1.5 0 0 1 3 12.5v-6A1.5 1.5 0 0 1 4.5 5H4zm1.5-1.5A2 2 0 0 1 9.5 5h-3V3.5a2 2 0 0 1 1.5-1.5z" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Z" />
                    </svg>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                        {repo.name}
                    </span>
                    {repo.private && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                            Private
                        </span>
                    )}
                    {repo.fork && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            Fork
                        </span>
                    )}
                </div>
                {repo.description && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                        {repo.description}
                    </p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                    {repo.language && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                            <span className={`w-2 h-2 rounded-full ${langColor}`} />
                            {repo.language}
                        </span>
                    )}
                    <span className="text-xs text-gray-400">
                        Updated {formatDate(repo.updated_at)}
                    </span>
                    <span className="text-xs text-gray-400">
                        ✦ {repo.default_branch}
                    </span>
                </div>
            </div>

            {/* Check */}
            {selected && (
                <svg
                    className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                    />
                </svg>
            )}
        </button>
    );
}

function RepoSkeleton() {
    return (
        <div className="flex items-start gap-3 px-4 py-3 animate-pulse">
            <div className="w-4 h-4 bg-gray-200 rounded mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/3" />
                <div className="h-2 bg-gray-200 rounded w-2/3" />
                <div className="flex gap-3">
                    <div className="h-2 bg-gray-200 rounded w-16" />
                    <div className="h-2 bg-gray-200 rounded w-20" />
                </div>
            </div>
        </div>
    );
}