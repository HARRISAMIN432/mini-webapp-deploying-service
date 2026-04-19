import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { AuthMethod } from "./user.model";

// ─── Types ────────────────────────────────────────────────────────────────────
export type OAuthProvider = Extract<AuthMethod, "google" | "github">;

export interface IOAuthAccount {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  provider: OAuthProvider;
  /** Provider's own user identifier (sub / id) */
  providerId: string;
  /** Provider access token — stored for potential API calls */
  accessToken: string;
  refreshToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOAuthAccountModel extends Model<IOAuthAccount> {
  findByProvider(
    provider: OAuthProvider,
    providerId: string,
  ): Promise<(Document<unknown, object, IOAuthAccount> & IOAuthAccount) | null>;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const oauthAccountSchema = new Schema<IOAuthAccount, IOAuthAccountModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["google", "github"] satisfies OAuthProvider[],
      required: true,
    },
    providerId: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
      select: false,
    },
    refreshToken: {
      type: String,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (
        _doc,
        ret: {
          __v?: number;
          accessToken?: string | null;
          refreshToken?: string | null;
        },
      ) => {
        delete ret.__v;
        delete ret.accessToken;
        delete ret.refreshToken;
        return ret;
      },
    },
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Compound unique: one account per provider per user
oauthAccountSchema.index({ provider: 1, providerId: 1 }, { unique: true });
oauthAccountSchema.index({ userId: 1, provider: 1 });

// ─── Statics ──────────────────────────────────────────────────────────────────
oauthAccountSchema.static(
  "findByProvider",
  function (provider: OAuthProvider, providerId: string) {
    return this.findOne({ provider, providerId });
  },
);

// ─── Model ────────────────────────────────────────────────────────────────────
export const OAuthAccount = mongoose.model<IOAuthAccount, IOAuthAccountModel>(
  "OAuthAccount",
  oauthAccountSchema,
);
