import { getDashboardUser } from "@/lib/dashboard";
import { getToken, getShops } from "@/lib/billz";
import { getLang } from "@/lib/i18n";
import { getCachedSellerStats } from "@/services/sellerCache";
import { detectSellerAnomalies } from "@/services/anomalyDetector";
import { makeCacheKey } from "@/lib/billzCache";
import AnomalyAlerts from "../components/AnomalyAlerts";

function toDateStr(d: Date) {
  return new Date(d.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function EmployeeAnomalyServer({ period }: { period: string }) {
  try {
    const user = await getDashboardUser();
    if (!user?.billzToken) return null;

    const isRu = getLang(user) === "ru";
    const userId = String(user.telegramId);
    const today = toDateStr(new Date());
    const startDate =
      period === "today"
        ? today
        : period === "7d"
        ? toDateStr(new Date(Date.now() - 7 * 86400000))
        : toDateStr(new Date(Date.now() - 30 * 86400000));

    const token = await getToken(user.billzToken, userId);
    const shopIds = user.selectedShopIds?.length
      ? user.selectedShopIds
      : (await getShops(token, userId)).map((s) => s.id);

    const rows = await getCachedSellerStats(user, token, shopIds, startDate, today);
    const sorted = [...rows].sort((a, b) => b.net_gross_sales - a.net_gross_sales);

    const anomalyCacheKey = makeCacheKey(userId, "anomaly::sellers", {
      period,
      shopIds: shopIds.join(","),
    });
    const anomalies = await detectSellerAnomalies(sorted, period, isRu, userId, anomalyCacheKey);

    return <AnomalyAlerts anomalies={anomalies} isRu={isRu} />;
  } catch (err) {
    console.error("[EmployeeAnomalyServer] failed:", err);
    return null;
  }
}
