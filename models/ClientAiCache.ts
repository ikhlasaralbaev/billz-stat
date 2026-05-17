import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClientAiCache extends Document {
  telegramId: number;
  clientId: string;
  billzToken: string;
  text: string;
  generatedAt: Date;
}

const ClientAiCacheSchema = new Schema<IClientAiCache>({
  telegramId:   { type: Number, required: true },
  clientId:     { type: String, required: true },
  billzToken:   { type: String, required: true },
  text:         { type: String, required: true },
  generatedAt:  { type: Date, default: Date.now },
});

ClientAiCacheSchema.index({ telegramId: 1, clientId: 1, billzToken: 1 }, { unique: true });

const ClientAiCache: Model<IClientAiCache> =
  mongoose.models.ClientAiCache ??
  mongoose.model<IClientAiCache>("ClientAiCache", ClientAiCacheSchema);

export default ClientAiCache;
