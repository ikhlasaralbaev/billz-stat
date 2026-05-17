import { getToken, getShops, getGeneralReport, getAllProducts, getProductSaleRows } from "@/lib/billz";
import { decryptBillzToken } from "@/lib/crypto";
import { calculateDeadStock, calculateOverstock } from "@/lib/insights";
import { buildReportSummary, buildShopSummaries } from "@/services/reportService";
import { connectDB } from "@/lib/db";
import Report from "@/models/Report";
import { IUser } from "@/models/user";

// UTC+5 (Tashkent) offset
function toDateStr(date: Date): string {
  return new Date(date.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function generateReportForUser(user: IUser, source: "command" | "cron" = "command") {
  await connectDB();

  const userId = String(user.telegramId);
  const token = await getToken(decryptBillzToken(user.billzToken!), userId);
  const allShops = await getShops(token, userId);
  const shopIds = user.selectedShopIds?.length
    ? user.selectedShopIds
    : allShops.map((s) => s.id);

  const today = toDateStr(new Date());
  const tomorrow = toDateStr(new Date(Date.now() + 86400000));
  const yesterday = toDateStr(new Date(Date.now() - 86400000));
  const sevenDaysAgo = toDateStr(new Date(Date.now() - 7 * 86400000));
  const thirtyDaysAgo = toDateStr(new Date(Date.now() - 30 * 86400000));

  const [generalRows, products, saleRows7d, saleRows30d] = await Promise.all([
    getGeneralReport(token, shopIds, yesterday, tomorrow, userId),
    getAllProducts(token, userId),
    getProductSaleRows(token, shopIds, sevenDaysAgo, today, userId),
    getProductSaleRows(token, shopIds, thirtyDaysAgo, today, userId),
  ]);

  const summary = buildReportSummary(generalRows, today, yesterday);
  const shops = buildShopSummaries(generalRows, today, yesterday);
  const deadStock = calculateDeadStock(products, saleRows7d);
  const overstock = calculateOverstock(products, saleRows30d);

  // Upsert: replace existing same-day report instead of creating a duplicate
  const report = await Report.findOneAndUpdate(
    { telegramId: user.telegramId, billzToken: user.billzToken, "today.date": today },
    {
      $set: {
        userId: user._id,
        source,
        shops,
        today: summary.today,
        yesterday: summary.yesterday,
        deadStock,
        overstock,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { report, summary, deadStock, overstock };
}
