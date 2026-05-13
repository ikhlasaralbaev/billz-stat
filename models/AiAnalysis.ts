import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAiAnalysis extends Document {
  reportId: Types.ObjectId;
  telegramId: number;
  aiModel: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
  responseText: string;
  generatedAt: Date;
}

const AiAnalysisSchema = new Schema<IAiAnalysis>(
  {
    reportId: { type: Schema.Types.ObjectId, ref: "Report", required: true },
    telegramId: { type: Number, required: true },
    aiModel: { type: String, required: true },
    inputTokens: { type: Number, required: true },
    outputTokens: { type: Number, required: true },
    totalTokens: { type: Number, required: true },
    durationMs: { type: Number, required: true },
    responseText: { type: String, required: true },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const AiAnalysis: Model<IAiAnalysis> =
  mongoose.models.AiAnalysis ?? mongoose.model<IAiAnalysis>("AiAnalysis", AiAnalysisSchema);

export default AiAnalysis;
