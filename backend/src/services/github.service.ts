/**
 * github.service.ts  (Phase 6)
 *
 * All GitHub API interactions. Tokens never leave the backend.
 *
 * Responsibilities:
 *  - Save / retrieve encrypted GitHub tokens
 *  - Fetch authenticated user profile
 *  - List / search / paginate user repositories
 *  - Validate a repo belongs to the authenticated user (for secure deploy)
 */

import { Types } from "mongoose";
import { GithubToken, encryptToken, decryptToken } from "../models/github-token.model";
import { unauthorized, notFound, forbidden } from "../utils/errors";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GithubUserProfile {
    id: number;
    login: string;
    name: string | null;
    avatarUrl: string | null;
    email: string | null;
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

export interface GithubConnectionStatus {
    connected: boolean;
    githubLogin?: string;
    githubId?: number;
    avatarUrl?: string | null;
    connectedAt?: Date;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const GITHUB_API = "https://api.github.com";

const githubFetch = async <T>(
    path: string,
    accessToken: string,
    options: RequestInit = {},
): Promise<T> => {
    const res = await fetch(`${GITHUB_API}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "ShipStack-Platform/1.0",
            ...(options.headers ?? {}),
        },
    });

    if (res.status === 401) {
        throw unauthorized("GitHub token is invalid or expired. Please reconnect GitHub.");
    }

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`GitHub API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
};

const getDecryptedToken = async (userId: string): Promise<string> => {
    const record = await GithubToken.findOne({
        userId: new Types.ObjectId(userId)
    }).select("+encryptedToken");

    if (!record) {
        throw unauthorized("GitHub account not connected. Please connect GitHub first.");
    }
    return decryptToken(record.encryptedToken);
};


export const saveGithubToken = async (
    userId: string,
    accessToken: string,
): Promise<GithubConnectionStatus> => {
    // Fetch profile to validate token and get display info
    const profile = await githubFetch<{
        id: number;
        login: string;
        name: string | null;
        avatar_url: string | null;
        email: string | null;
    }>("/user", accessToken);

    const encrypted = encryptToken(accessToken);

    await GithubToken.findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        {
            encryptedToken: encrypted,
            githubLogin: profile.login,
            githubId: profile.id,
            avatarUrl: profile.avatar_url,
            connectedAt: new Date(),
        },
        { upsert: true, new: true },
    );

    return {
        connected: true,
        githubLogin: profile.login,
        githubId: profile.id,
        avatarUrl: profile.avatar_url,
        connectedAt: new Date(),
    };
};

/**
 * Returns connected status and public profile info (no token).
 */
export const getGithubStatus = async (
    userId: string,
): Promise<GithubConnectionStatus> => {
    const record = await GithubToken.findByUser(userId);
    if (!record) return { connected: false };

    return {
        connected: true,
        githubLogin: record.githubLogin,
        githubId: record.githubId,
        avatarUrl: record.avatarUrl,
        connectedAt: record.connectedAt,
    };
};

/**
 * Disconnect GitHub — removes the stored token.
 */
export const disconnectGithub = async (userId: string): Promise<void> => {
    await GithubToken.deleteOne({ userId: new Types.ObjectId(userId) });
};

/**
 * Fetch paginated + searchable repository list for the authenticated user.
 * Returns repos sorted by pushed_at (most recently updated first).
 */
export const listGithubRepos = async (
    userId: string,
    page = 1,
    perPage = 20,
    search = "",
): Promise<GithubRepoPage> => {
    const accessToken = await getDecryptedToken(userId);
    const safePage = Math.max(1, page);
    const safePerPage = Math.min(100, Math.max(1, perPage));

    // GitHub Search API when query provided, otherwise list endpoint
    let repos: GithubRepo[];
    let hasMore = false;

    if (search.trim()) {
        // Use GitHub's search endpoint for text search
        const query = encodeURIComponent(
            `${search.trim()} user:@me fork:true`,
        );
        const data = await githubFetch<{
            items: Array<{
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
            }>;
            total_count: number;
        }>(
            `/search/repositories?q=${query}&sort=updated&order=desc&per_page=${safePerPage}&page=${safePage}`,
            accessToken,
        );

        repos = data.items.map((r) => ({
            id: r.id,
            name: r.name,
            full_name: r.full_name,
            private: r.private,
            default_branch: r.default_branch,
            html_url: r.html_url,
            updated_at: r.updated_at,
            description: r.description,
            language: r.language,
            stargazers_count: r.stargazers_count,
            fork: r.fork,
        }));

        hasMore = safePage * safePerPage < data.total_count;
    } else {
        // List all repos sorted by updated
        const data = await githubFetch<
            Array<{
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
            }>
        >(
            `/user/repos?sort=updated&direction=desc&per_page=${safePerPage}&page=${safePage}&affiliation=owner,collaborator`,
            accessToken,
        );

        repos = data.map((r) => ({
            id: r.id,
            name: r.name,
            full_name: r.full_name,
            private: r.private,
            default_branch: r.default_branch,
            html_url: r.html_url,
            updated_at: r.updated_at,
            description: r.description,
            language: r.language,
            stargazers_count: r.stargazers_count,
            fork: r.fork,
        }));

        // GitHub paginates using Link header; if we got a full page there's likely more
        hasMore = data.length === safePerPage;
    }

    return { repos, page: safePage, perPage: safePerPage, hasMore };
};

/**
 * Validates that a given full_name (owner/repo) belongs to the authenticated
 * user. Throws forbidden() if not. Returns the repo metadata on success.
 *
 * Used during project creation / deployment to prevent spoofing.
 */
export const validateRepoOwnership = async (
    userId: string,
    fullName: string, // "owner/repo"
): Promise<GithubRepo> => {
    const accessToken = await getDecryptedToken(userId);

    // Will 404 if token can't access the repo (private + not theirs, deleted, etc.)
    const repo = await githubFetch<{
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
        permissions?: { admin: boolean; push: boolean; pull: boolean };
    }>(`/repos/${fullName}`, accessToken).catch((err: Error) => {
        if (err.message.includes("404")) {
            throw forbidden(
                "Repository not found or you do not have access to it.",
            );
        }
        throw err;
    });

    // Must have at least push (write) access — prevents using someone else's public repo
    if (repo.permissions && !repo.permissions.push) {
        throw forbidden("You do not have write access to this repository.");
    }

    return {
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        default_branch: repo.default_branch,
        html_url: repo.html_url,
        updated_at: repo.updated_at,
        description: repo.description,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        fork: repo.fork,
    };
};