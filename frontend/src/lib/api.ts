export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public fields?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const baseUrl = (): string =>
  (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

type ApiSuccess<T> = { success: true; data: T; message?: string };
type ApiFailure = {
  success: false;
  error: string;
  code?: string;
  fields?: Record<string, string[] | undefined>;
};

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
    },
  });

  const json = (await res.json()) as ApiSuccess<T> | ApiFailure;

  if (!res.ok || !json.success) {
    const err = json as ApiFailure;
    throw new ApiError(
      err.error ?? "Request failed",
      err.code,
      res.status,
      err.fields,
    );
  }

  return json.data;
}

export function getOAuthStartUrl(
  provider: "google" | "github",
  redirectToPath = "/auth/callback",
): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_ORIGIN ?? "";
  const redirectTo = `${origin}${redirectToPath.startsWith("/") ? redirectToPath : `/${redirectToPath}`}`;
  const q = new URLSearchParams({ redirectTo });
  return `${baseUrl()}/api/auth/oauth/${provider}?${q}`;
}
