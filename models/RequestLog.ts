import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRequestLog extends Document {
  userTelegramId?: string;
  service: "billz" | "anthropic";
  method: "GET" | "POST";
  url: string;
  requestParams?: Record<string, unknown>;
  shopIds?: string[];
  responseStatus?: number;
  responseRowCount?: number;
  responsePreview?: Record<string, unknown>;
  durationMs: number;
  error?: string;
  createdAt: Date;
}

const RequestLogSchema = new Schema<IRequestLog>(
  {
    userTelegramId: { type: String, default: null },
    service: { type: String, enum: ["billz", "anthropic"], required: true },
    method: { type: String, enum: ["GET", "POST"], required: true },
    url: { type: String, required: true },
    requestParams: { type: Schema.Types.Mixed, default: null },
    shopIds: { type: [String], default: undefined },
    responseStatus: { type: Number, default: null },
    responseRowCount: { type: Number, default: null },
    responsePreview: { type: Schema.Types.Mixed, default: null },
    durationMs: { type: Number, required: true },
    error: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

RequestLogSchema.index({ createdAt: -1 });
RequestLogSchema.index({ userTelegramId: 1, createdAt: -1 });

const RequestLog: Model<IRequestLog> =
  mongoose.models.RequestLog ??
  mongoose.model<IRequestLog>("RequestLog", RequestLogSchema);

export default RequestLog;
