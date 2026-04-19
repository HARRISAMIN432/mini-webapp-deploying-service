import mongoose, {
  HydratedDocument,
  Model,
  Query,
  Schema,
  Types,
} from "mongoose";
import bcrypt from "bcryptjs";

// ─── Types ────────────────────────────────────────────────────────────────────
export type AuthMethod = "email" | "google" | "github";

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string | null;
  emailVerified: boolean;
  authMethod: AuthMethod;
  /** Pending TOTP secret before the user confirms enrollment */
  totpSecretPending: string | null;
  totpSecret: string | null;
  totpEnabled: boolean;
  /** Soft-delete */
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(plain: string): Promise<boolean>;
  toPublic(): PublicUser;
}

export interface IUserModel extends Model<IUser, object, IUserMethods> {
  findByEmail(
    email: string,
  ): Query<
    HydratedDocument<IUser, IUserMethods> | null,
    HydratedDocument<IUser, IUserMethods>,
    object,
    IUser
  >;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  totpEnabled: boolean;
  authMethod: AuthMethod;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const userSchema = new Schema<IUser, IUserModel, IUserMethods>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name must be at most 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
      index: true,
    },
    passwordHash: {
      type: String,
      default: null,
      select: false, // Never returned in queries unless explicitly requested
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    authMethod: {
      type: String,
      enum: ["email", "google", "github"] satisfies AuthMethod[],
      required: true,
      default: "email",
    },
    totpSecretPending: {
      type: String,
      default: null,
      select: false,
    },
    totpSecret: {
      type: String,
      default: null,
      select: false,
    },
    totpEnabled: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt + updatedAt automatically
    // Never leak sensitive fields in JSON serialisation
    toJSON: {
      transform: (_doc, ret: Partial<IUser> & { __v?: number }) => {
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.totpSecret;
        delete ret.totpSecretPending;
        delete ret.deletedAt;
        return ret;
      },
    },
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
userSchema.index({ createdAt: -1 });

// ─── Instance Methods ─────────────────────────────────────────────────────────
userSchema.method(
  "comparePassword",
  async function (plain: string): Promise<boolean> {
    if (!this.passwordHash) return false;
    return bcrypt.compare(plain, this.passwordHash);
  },
);

userSchema.method("toPublic", function (): PublicUser {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    emailVerified: this.emailVerified,
    totpEnabled: this.totpEnabled,
    authMethod: this.authMethod,
  };
});

// ─── Static Methods ───────────────────────────────────────────────────────────
userSchema.static("findByEmail", function (email: string) {
  return this.findOne({ email: email.toLowerCase(), deletedAt: null });
});

userSchema.pre(/^find/, function (this: mongoose.Query<unknown, IUser>) {
  if (!this.getFilter()["deletedAt"]) {
    this.where({ deletedAt: null });
  }
});

// ─── Model ────────────────────────────────────────────────────────────────────
export const User = mongoose.model<IUser, IUserModel>("User", userSchema);
