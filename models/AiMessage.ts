import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAiMessage extends Document {
  telegramId: number;
  billzToken: string | null;
  role: "user" | "ai";
  text: string;
  aiModel?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  durationMs?: number;
  createdAt: Date;
}

const AiMessageSchema = new Schema<IAiMessage>(
  {
    telegramId: { type: Number, required: true },
    billzToken: { type: String, default: null },
    role: { type: String, enum: ["user", "ai"], required: true },
    text: { type: String, required: true },
    aiModel:      { type: String },
    inputTokens:  { type: Number },
    outputTokens: { type: Number },
    totalTokens:  { type: Number },
    durationMs:   { type: Number },
  },
  { timestamps: true }
);

AiMessageSchema.index({ telegramId: 1, billzToken: 1, createdAt: -1 });

const AiMessage: Model<IAiMessage> =
  mongoose.models.AiMessage ?? mongoose.model<IAiMessage>("AiMessage", AiMessageSchema);

export default AiMessage;
