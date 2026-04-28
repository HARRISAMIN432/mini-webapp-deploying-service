/**
 * github-token.model.ts  (Phase 6)
 *
 * Stores encrypted GitHub OAuth access tokens per user.
 * Token is AES-256-GCM encrypted at rest using ENCRYPTION_SECRET env var.
 * Only one GitHub connection per user — upsert on reconnect.
 */

import mongoose, { Document, Model, Schema, Types } from "mongoose";
import crypto from "crypto";

// ─── Encryption helpers ───────────────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

const getEncryptionKey = (): Buffer => {
    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error(
            "ENCRYPTION_SECRET env var must be at least 32 characters",
        );
    }
    // Derive a 32-byte key from whatever secret length is provided
    return crypto.createHash("sha256").update(secret).digest();
};

export const encryptToken = (plain: string): string => {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plain, "utf8"),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decryptToken = (stored: string): string => {
    const key = getEncryptionKey();
    const [ivHex, tagHex, cipherHex] = stored.split(":");
    if (!ivHex || !tagHex || !cipherHex) {
        throw new Error("Invalid encrypted token format");
    }
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const ciphertext = Buffer.from(cipherHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext) + decipher.final("utf8");
};

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IGithubToken {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    encryptedToken: string;
    githubLogin: string;
    githubId: number;
    avatarUrl: string | null;
    connectedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IGithubTokenModel extends Model<IGithubToken> {
    findByUser(
        userId: string | Types.ObjectId,
    ): Promise<(Document & IGithubToken) | null>;
}


const githubTokenSchema = new Schema<IGithubToken, IGithubTokenModel>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true, // One GitHub connection per user
            index: true,
        },
        encryptedToken: {
            type: String,
            required: true,
            select: false, // Never returned unless explicitly requested
        },
        githubLogin: {
            type: String,
            required: true,
            trim: true,
        },
        githubId: {
            type: Number,
            required: true,
        },
        avatarUrl: {
            type: String,
            default: null,
        },
        connectedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform: (_doc, ret: Record<string, unknown>) => {
                delete ret.__v;
                delete ret.encryptedToken; // Never expose in JSON
                return ret;
            },
        },
    },
);


githubTokenSchema.static(
    "findByUser",
    function (userId: string | Types.ObjectId) {
        return this.findOne({ userId: new Types.ObjectId(userId.toString()) });
    },
);


export const GithubToken = mongoose.model<IGithubToken, IGithubTokenModel>(
    "GithubToken",
    githubTokenSchema,
);