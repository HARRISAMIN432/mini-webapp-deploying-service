"use client";

import { useEffect, useState, useCallback } from "react";
import { githubApi, type GithubConnectionStatus } from "@/lib/api-github";

interface UseGithubStatusResult {
    status: GithubConnectionStatus | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
    disconnect: () => Promise<void>;
    disconnecting: boolean;
}

export function useGithubStatus(): UseGithubStatusResult {
    const [status, setStatus] = useState<GithubConnectionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [disconnecting, setDisconnecting] = useState(false);

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await githubApi.getStatus();
            setStatus(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load GitHub status");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch();
    }, [fetch]);

    const disconnect = async () => {
        setDisconnecting(true);
        try {
            await githubApi.disconnect();
            setStatus({ connected: false });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to disconnect");
        } finally {
            setDisconnecting(false);
        }
    };

    return { status, loading, error, refetch: fetch, disconnect, disconnecting };
}