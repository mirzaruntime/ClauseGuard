import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  /** Defaults to zero for existing MongoDB records that predate this field. */
  tokenVersion?: number;
  resetPasswordTokenHash?: string;
  resetPasswordExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  toSafeJSON(): SafeUser;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser, IUserMethods>;
export type UserModel = Model<IUser, Record<string, never>, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      index: true,
    },
    // Never contains plaintext; excluded from query results unless explicitly selected.
    passwordHash: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0, min: 0, select: false },
    resetPasswordTokenHash: { type: String, select: false, index: true },
    resetPasswordExpiresAt: { type: Date, select: false },
  },
  { timestamps: true },
);

userSchema.methods.toSafeJSON = function toSafeJSON(this: UserDocument): SafeUser {
  return {
    id: (this._id as Types.ObjectId).toString(),
    name: this.name,
    email: this.email,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

userSchema.set('toJSON', {
  virtuals: false,
  transform: (_doc, raw) => {
    const ret = raw as unknown as Record<string, unknown>;
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

export const User = model<IUser, UserModel>('User', userSchema);
