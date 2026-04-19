export type OAuthProvider = "google" | "github";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  totpEnabled: boolean;
  authMethod: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export type LoginResponse =
  | {
      requiresOtp: true;
      otpMethod: "email" | "totp";
      user: PublicUser;
    }
  | {
      user: PublicUser;
      tokens: TokenPair;
    };

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
