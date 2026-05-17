import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClientSnapshot extends Document {
  telegramId: number;
  billzToken: string;
  clientId: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumbers: string[];
  balance: number;
  lastTransactionDate: string | null;
  firstTransactionDate: string | null;
  registeredAt: string;
  totalSpend: number;
  orderCount: number;
  returnCount: number;
  avgOrderValue: number;
  syncedAt: Date;
}

const ClientSnapshotSchema = new Schema<IClientSnapshot>({
  telegramId:           { type: Number, required: true },
  billzToken:           { type: String, required: true },
  clientId:             { type: String, required: true },
  firstName:            { type: String, default: null },
  lastName:             { type: String, default: null },
  phoneNumbers:         { type: [String], default: [] },
  balance:              { type: Number, default: 0 },
  lastTransactionDate:  { type: String, default: null },
  firstTransactionDate: { type: String, default: null },
  registeredAt:         { type: String, default: "" },
  totalSpend:           { type: Number, default: 0 },
  orderCount:           { type: Number, default: 0 },
  returnCount:          { type: Number, default: 0 },
  avgOrderValue:        { type: Number, default: 0 },
  syncedAt:             { type: Date, default: Date.now },
});

ClientSnapshotSchema.index({ telegramId: 1, billzToken: 1, clientId: 1 }, { unique: true });
ClientSnapshotSchema.index({ telegramId: 1, billzToken: 1 });

const ClientSnapshot: Model<IClientSnapshot> =
  mongoose.models.ClientSnapshot ??
  mongoose.model<IClientSnapshot>("ClientSnapshot", ClientSnapshotSchema);

export default ClientSnapshot;
