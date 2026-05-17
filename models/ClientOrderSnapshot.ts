import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IOrderProduct {
  name: string;
  qty: number;
  netSales: number;
}

export interface IClientOrderSnapshot extends Document {
  telegramId: number;
  billzToken: string;
  clientId: string;
  clientRef: Types.ObjectId;
  orderId: string;
  orderNumber: string;
  orderType: string;
  shopName: string;
  sellerName: string;
  orderDate: string;
  netSales: number;
  netProfit: number;
  discountPercent: number;
  products: IOrderProduct[];
  syncedAt: Date;
}

const OrderProductSchema = new Schema<IOrderProduct>(
  {
    name:     { type: String, required: true },
    qty:      { type: Number, required: true },
    netSales: { type: Number, required: true },
  },
  { _id: false }
);

const ClientOrderSnapshotSchema = new Schema<IClientOrderSnapshot>({
  telegramId:      { type: Number, required: true },
  billzToken:      { type: String, required: true },
  clientId:        { type: String, required: true },
  clientRef:       { type: Schema.Types.ObjectId, ref: "ClientSnapshot", required: true },
  orderId:         { type: String, required: true },
  orderNumber:     { type: String, default: "" },
  orderType:       { type: String, default: "" },
  shopName:        { type: String, default: "" },
  sellerName:      { type: String, default: "" },
  orderDate:       { type: String, default: "" },
  netSales:        { type: Number, default: 0 },
  netProfit:       { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },
  products:        { type: [OrderProductSchema], default: [] },
  syncedAt:        { type: Date, default: Date.now },
});

ClientOrderSnapshotSchema.index({ telegramId: 1, billzToken: 1, orderId: 1 }, { unique: true });
ClientOrderSnapshotSchema.index({ clientRef: 1 });
ClientOrderSnapshotSchema.index({ telegramId: 1, billzToken: 1 });

const ClientOrderSnapshot: Model<IClientOrderSnapshot> =
  mongoose.models.ClientOrderSnapshot ??
  mongoose.model<IClientOrderSnapshot>("ClientOrderSnapshot", ClientOrderSnapshotSchema);

export default ClientOrderSnapshot;
