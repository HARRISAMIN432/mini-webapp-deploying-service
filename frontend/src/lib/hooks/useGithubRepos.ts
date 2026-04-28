"use client";


import { useEffect, useState, useCallback, useRef } from "react";
import { githubApi, type GithubRepo } from "@/lib/api-github";

interface UseGithubReposOptions {
    enabled?: boolean; // Only fetch if GitHub is connected
    perPage?: number;
}

interface UseGithubReposResult {
    repos: GithubRepo[];
    loading: boolean;
    loadingMore: boolean;
    error: string | null;
    search: string;
    setSearch: (q: string) => void;
    hasMore: boolean;
    loadMore: () => void;
    refetch: () => void;
}

export function useGithubRepos({
    enabled = true,
    perPage = 20,
}: UseGithubReposOptions = {}): UseGithubReposResult {
    const [repos, setRepos] = useState<GithubRepo[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearchRaw] = useState("");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const setSearch = useCallback((q: string) => {
        setSearchRaw(q);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setDebouncedSearch(q);
            setPage(1);
        }, 350);
    }, []);

    const fetchPage = useCallback(
        async (pageNum: number, append: boolean) => {
            if (!enabled) return;
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);
            setError(null);

            try {
                const result = await githubApi.listRepos(
                    pageNum,
                    debouncedSearch,
                    perPage,
                );
                setRepos((prev) =>
                    append ? [...prev, ...result.repos] : result.repos,
                );
                setHasMore(result.hasMore);
                setPage(pageNum);
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Failed to load repositories",
                );
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [enabled, debouncedSearch, perPage],
    );

    // Reset and refetch when search changes
    useEffect(() => {
        if (!enabled) return;
        fetchPage(1, false);
    }, [enabled, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadMore = useCallback(() => {
        if (hasMore && !loadingMore) {
            fetchPage(page + 1, true);
        }
    }, [hasMore, loadingMore, page, fetchPage]);

    const refetch = useCallback(() => {
        fetchPage(1, false);
    }, [fetchPage]);

    return {
        repos,
        loading,
        loadingMore,
        error,
        search,
        setSearch,
        hasMore,
        loadMore,
        refetch,
    };
}