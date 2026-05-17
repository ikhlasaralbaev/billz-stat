import mongoose, { Schema, Document, Model } from "mongoose";

export interface IApiRequestEntry {
  method: string;
  url: string;
  count: number;
  status: "success" | "error";
}

export interface IBillzApiLog extends Document {
  telegramId: number;
  billzToken: string;
  action: string;
  requests: IApiRequestEntry[];
  totalRequests: number;
  durationMs: number;
  startedAt: Date;
  completedAt: Date;
  meta: Record<string, unknown>;
}

const ApiRequestEntrySchema = new Schema<IApiRequestEntry>(
  {
    method:  { type: String, required: true },
    url:     { type: String, required: true },
    count:   { type: Number, required: true },
    status:  { type: String, enum: ["success", "error"], required: true },
  },
  { _id: false }
);

const BillzApiLogSchema = new Schema<IBillzApiLog>({
  telegramId:    { type: Number, required: true },
  billzToken:    { type: String, required: true },
  action:        { type: String, required: true },
  requests:      { type: [ApiRequestEntrySchema], default: [] },
  totalRequests: { type: Number, default: 0 },
  durationMs:    { type: Number, default: 0 },
  startedAt:     { type: Date, required: true },
  completedAt:   { type: Date, required: true },
  meta:          { type: Schema.Types.Mixed, default: {} },
});

BillzApiLogSchema.index({ telegramId: 1, action: 1 });
BillzApiLogSchema.index({ startedAt: -1 });

const BillzApiLog: Model<IBillzApiLog> =
  mongoose.models.BillzApiLog ??
  mongoose.model<IBillzApiLog>("BillzApiLog", BillzApiLogSchema);

export default BillzApiLog;
