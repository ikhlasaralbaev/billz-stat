import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { DailyStats, ShopSummary } from "@/services/reportService";
import { DeadStockItem, OverstockItem } from "@/lib/insights";

export interface IReport extends Document {
  userId: Types.ObjectId;
  telegramId: number;
  billzToken: string | null;
  source: "command" | "cron";
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  shops: ShopSummary[];
  today: DailyStats;
  yesterday: DailyStats;
  deadStock: DeadStockItem[];
  overstock: OverstockItem[];
}

const DailyStatsSchema = new Schema({
  date: String,
  shopsCount: Number,
  grossSales: Number,
  netGrossSales: Number,
  grossProfit: Number,
  profitMargin: Number,
  discountSum: Number,
  supplyCost: Number,
  ordersCount: Number,
  returnsCount: Number,
  productsSold: Number,
  averageCheque: Number,
}, { _id: false });

const ShopSummarySchema = new Schema({
  shopName: String,
  today: DailyStatsSchema,
  yesterday: DailyStatsSchema,
}, { _id: false });

const DeadStockSchema = new Schema({
  name: String,
  sku: String,
  totalStock: Number,
  totalSupplyCost: Number,
  totalRetailValue: Number,
  shopNames: [String],
}, { _id: false });

const OverstockSchema = new Schema({
  name: String,
  sku: String,
  totalStock: Number,
  soldLast30d: Number,
  daysOfStock: Number,
  totalSupplyCost: Number,
  totalRetailValue: Number,
  shopNames: [String],
}, { _id: false });

const ReportSchema = new Schema<IReport>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    telegramId: { type: Number, required: true },
    billzToken: { type: String, default: null },
    source: { type: String, enum: ["command", "cron"], default: "command" },
    generatedAt: { type: Date, default: Date.now },
    shops: [ShopSummarySchema],
    today: DailyStatsSchema,
    yesterday: DailyStatsSchema,
    deadStock: [DeadStockSchema],
    overstock: [OverstockSchema],
  },
  { timestamps: true }
);

const Report: Model<IReport> =
  mongoose.models.Report ?? mongoose.model<IReport>("Report", ReportSchema);

export default Report;
