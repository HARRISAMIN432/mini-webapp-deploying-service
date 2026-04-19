export type OAuthProvider = "google" | "github";

export interface OAuthProviderConfig {
  id: OAuthProvider;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export type AuthFormState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };
