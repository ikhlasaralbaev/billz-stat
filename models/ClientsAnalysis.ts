import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClientsAnalysis extends Document {
  telegramId: number;
  billzToken: string;
  analyzedAt: Date;
  clientCount: number;
  orderCount: number;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  result: Record<string, unknown>;
}

const ClientsAnalysisSchema = new Schema<IClientsAnalysis>(
  {
    telegramId:   { type: Number, required: true },
    billzToken:   { type: String, required: true },
    analyzedAt:   { type: Date, default: Date.now },
    clientCount:  { type: Number, default: 0 },
    orderCount:   { type: Number, default: 0 },
    durationMs:   { type: Number, default: 0 },
    inputTokens:  { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    result:       { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

ClientsAnalysisSchema.index({ telegramId: 1, billzToken: 1, analyzedAt: -1 });

const ClientsAnalysis: Model<IClientsAnalysis> =
  mongoose.models.ClientsAnalysis ??
  mongoose.model<IClientsAnalysis>("ClientsAnalysis", ClientsAnalysisSchema);

export default ClientsAnalysis;
