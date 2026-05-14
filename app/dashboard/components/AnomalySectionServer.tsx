import { getDashboardUser } from "@/lib/dashboard";
import { getRecentReports } from "@/lib/dashboard";
import { getLang } from "@/lib/i18n";
import { detectShopAnomalies } from "@/services/anomalyDetector";
import { makeCacheKey } from "@/lib/billzCache";
import type { GeneralReportRow } from "@/lib/billz";
import AnomalyAlerts from "./AnomalyAlerts";

export default async function AnomalySectionServer() {
  try {
  const user = await getDashboardUser();
  if (!user) return null;

  const isRu = getLang(user) === "ru";
  const reports30d = await getRecentReports(user.telegramId, 30, user.billzToken);

  if (reports30d.length === 0) return null;

  const syntheticRows: GeneralReportRow[] = reports30d.map((r) => ({
    date: r.today?.date ?? new Date(r.createdAt).toISOString().slice(0, 10),
    shop_id: "all",
    shop_name: "All",
    gross_sales: Number(r.today?.grossSales ?? 0),
    net_gross_sales: Number(r.today?.netGrossSales ?? 0),
    gross_profit: Number(r.today?.grossProfit ?? 0),
    discount_sum: Number(r.today?.discountSum ?? 0),
    discount_percent: 0,
    sales_supply_price: 0,
    transactions_count: Number(r.today?.ordersCount ?? 0),
    orders_count: Number(r.today?.ordersCount ?? 0),
    returns_count: Number(r.today?.returnsCount ?? 0),
    products_sold: Number(r.today?.productsSold ?? 0),
    average_cheque: Number(r.today?.averageCheque ?? 0),
    average_extra_charge: 0,
  }));

  // Stable cache key — based on report count and most recent report date only
  const latestDate = reports30d[0]?.createdAt
    ? new Date(reports30d[0].createdAt).toISOString().slice(0, 10)
    : "";
  const anomalyCacheKey = makeCacheKey(String(user.telegramId), "anomaly::shop", {
    period: "30d",
    reportCount: String(reports30d.length),
    latestDate,
  });

  const anomalies = await detectShopAnomalies(
    syntheticRows,
    "last 30 days",
    isRu,
    String(user.telegramId),
    anomalyCacheKey,
  );

  return <AnomalyAlerts anomalies={anomalies} isRu={isRu} />;
  } catch (err) {
    console.error("[AnomalySectionServer] failed:", err);
    return null;
  }
}
