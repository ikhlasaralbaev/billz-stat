import { detectSellerAnomalies } from "@/services/anomalyDetector";
import { makeCacheKey } from "@/lib/billzCache";
import { SellerStatRow } from "@/lib/billz";
import AnomalyAlerts from "../components/AnomalyAlerts";

export default async function EmployeeAnomalyServer({
  sellers,
  period,
  shopIds,
  userId,
  isRu,
}: {
  sellers: SellerStatRow[];
  period: string;
  shopIds: string[];
  userId: string;
  isRu: boolean;
}) {
  try {
    if (sellers.length === 0) return null;

    const anomalyCacheKey = makeCacheKey(userId, "anomaly::sellers", {
      period,
      shopIds: shopIds.join(","),
    });

    const anomalies = await detectSellerAnomalies(sellers, period, isRu, userId, anomalyCacheKey);

    return <AnomalyAlerts anomalies={anomalies} isRu={isRu} />;
  } catch (err) {
    console.error("[EmployeeAnomalyServer] failed:", err);
    return null;
  }
}
