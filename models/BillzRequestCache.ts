import mongoose, { Schema, Model } from "mongoose";

interface IBillzRequestCache {
  cacheKey: string;
  userTelegramId?: string;
  url: string;
  params: unknown;
  responseData: unknown;
  expiresAt: Date;
  createdAt: Date;
}

const BillzRequestCacheSchema = new Schema<IBillzRequestCache>(
  {
    cacheKey: { type: String, required: true },
    userTelegramId: { type: String },
    url: { type: String },
    params: { type: Schema.Types.Mixed },
    responseData: { type: Schema.Types.Mixed },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BillzRequestCacheSchema.index({ cacheKey: 1 }, { unique: true });
// MongoDB auto-deletes expired docs
BillzRequestCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const BillzRequestCache: Model<IBillzRequestCache> =
  mongoose.models.BillzRequestCache ??
  mongoose.model<IBillzRequestCache>("BillzRequestCache", BillzRequestCacheSchema);

export default BillzRequestCache;
