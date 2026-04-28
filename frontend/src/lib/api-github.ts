import { apiRequest } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GithubConnectionStatus {
    connected: boolean;
    githubLogin?: string;
    githubId?: number;
    avatarUrl?: string | null;
    connectedAt?: string;
}

export interface GithubRepo {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    default_branch: string;
    html_url: string;
    updated_at: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    fork: boolean;
}

export interface GithubRepoPage {
    repos: GithubRepo[];
    page: number;
    perPage: number;
    hasMore: boolean;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export const githubApi = {
    /** Returns whether GitHub is connected + public profile info */
    getStatus: () =>
        apiRequest<GithubConnectionStatus>("/api/github/status"),

    /** Remove the stored GitHub token */
    disconnect: () =>
        apiRequest<null>("/api/github/disconnect", { method: "POST" }),

    /** Paginated, searchable repo list */
    listRepos: (page = 1, search = "", perPage = 20) => {
        const q = new URLSearchParams({
            page: String(page),
            perPage: String(perPage),
            search,
        });
        return apiRequest<GithubRepoPage>(`/api/github/repos?${q}`);
    },
};