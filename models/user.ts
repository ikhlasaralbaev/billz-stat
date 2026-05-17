import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole = "USER" | "ADMIN";

export interface IUser extends Document {
  telegramId: number;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  username: string | null;
  phoneNumber: string | null;
  avatarFileId: string | null;
  language: string | null;
  webToken: string | null;
  billzToken: string | null;
  selectedShopIds: string[];
  selectedShopNames: string[];
  reportHour: number;
  role: UserRole;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    telegramId: { type: Number, required: true, unique: true },
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    fullName: { type: String, default: null },
    username: { type: String, default: null },
    phoneNumber: { type: String, default: null },
    avatarFileId: { type: String, default: null },
    language: { type: String, enum: ["uz", "ru"], default: null },
    webToken: { type: String, default: null },
    billzToken: { type: String, default: null },
    selectedShopIds: { type: [String], default: [] },
    selectedShopNames: { type: [String], default: [] },
    reportHour: { type: Number, default: 20 },
    role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export default User;
