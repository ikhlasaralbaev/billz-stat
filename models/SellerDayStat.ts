import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISellerDayStat extends Document {
  telegramId: number;
  billzToken: string | null;
  sellerId: string;
  sellerName: string;
  date: string; // YYYY-MM-DD
  grossSales: number;
  netGrossSales: number;
  netGrossProfit: number;
  discountSum: number;
  discountPercent: number;
  returnedMeasurementValue: number;
  soldMeasurementValue: number;
  transactionCount: number;
  ordersCount: number;
}

const SellerDayStatSchema = new Schema<ISellerDayStat>(
  {
    telegramId: { type: Number, required: true },
    billzToken: { type: String, default: null },
    sellerId: { type: String, required: true },
    sellerName: { type: String, default: "" },
    date: { type: String, required: true },
    grossSales: { type: Number, default: 0 },
    netGrossSales: { type: Number, default: 0 },
    netGrossProfit: { type: Number, default: 0 },
    discountSum: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    returnedMeasurementValue: { type: Number, default: 0 },
    soldMeasurementValue: { type: Number, default: 0 },
    transactionCount: { type: Number, default: 0 },
    ordersCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Unique constraint: one record per user + token + seller + day
SellerDayStatSchema.index(
  { telegramId: 1, billzToken: 1, sellerId: 1, date: 1 },
  { unique: true }
);

// Non-unique index for range queries across all sellers for a user/date range
SellerDayStatSchema.index({ telegramId: 1, billzToken: 1, date: 1 });

const SellerDayStat: Model<ISellerDayStat> =
  mongoose.models.SellerDayStat ??
  mongoose.model<ISellerDayStat>("SellerDayStat", SellerDayStatSchema);

export default SellerDayStat;
