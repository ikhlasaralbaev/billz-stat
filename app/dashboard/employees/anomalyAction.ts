"use server";

import { getDashboardUser } from "@/lib/dashboard";
import { makeCacheKey } from "@/lib/billzCache";
import { detectSellerAnomalies } from "@/services/anomalyDetector";
import type { SellerStatRow } from "@/lib/billz";
import type { Anomaly } from "@/types/anomaly";

export async function fetchEmployeeAnomalies(
  sellers: SellerStatRow[],
  period: string,
  shopIds: string[],
  isRu: boolean
): Promise<Anomaly[]> {
  const user = await getDashboardUser();
  if (!user) return [];

  const userId = String(user.telegramId);
  const anomalyCacheKey = makeCacheKey(userId, "anomaly::sellers", {
    period,
    shopIds: shopIds.join(","),
  });

  return detectSellerAnomalies(sellers, period, isRu, userId, anomalyCacheKey);
}
