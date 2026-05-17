"use client";

import { useState } from "react";
import { fetchEmployeeAnomalies } from "./anomalyAction";
import AnomalyAlerts from "../components/AnomalyAlerts";
import type { SellerStatRow } from "@/lib/billz";
import type { Anomaly } from "@/types/anomaly";

type Status = "idle" | "loading" | "done" | "error";

export default function EmployeeAnomalyButton({
  sellers,
  period,
  shopIds,
  isRu,
}: {
  sellers: SellerStatRow[];
  period: string;
  shopIds: string[];
  isRu: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  async function handleClick() {
    setStatus("loading");
    try {
      const result = await fetchEmployeeAnomalies(sellers, period, shopIds, isRu);
      setAnomalies(result);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "idle") {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors w-full sm:w-auto mb-2"
        style={{ background: "#0D1526", border: "1px solid #1E293B", color: "#A5B4FC" }}
      >
        <span style={{ fontSize: 15 }}>✦</span>
        {isRu ? "AI анализ" : "AI tahlil"}
      </button>
    );
  }

  if (status === "loading") {
    return (
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3 mb-4"
        style={{ background: "#0D1526", border: "1px solid #1E293B" }}
      >
        <span
          style={{
            display: "inline-block",
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "2px solid #1E293B",
            borderTopColor: "#6366F1",
            animation: "spin 0.7s linear infinite",
            flexShrink: 0,
          }}
        />
        <span className="text-sm" style={{ color: "#A5B4FC" }}>
          {isRu ? "AI анализирует данные..." : "AI ma'lumotlarni tahlil qilmoqda..."}
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3"
        style={{ background: "#1A0A0A", border: "1px solid #3B1111", color: "#F87171" }}
      >
        <span>{isRu ? "Ошибка анализа. Попробуйте снова." : "Tahlil xatosi. Qayta urinib ko'ring."}</span>
        <button
          onClick={handleClick}
          className="text-xs underline shrink-0"
          style={{ color: "#F87171" }}
        >
          {isRu ? "Повторить" : "Qayta"}
        </button>
      </div>
    );
  }

  // done
  if (anomalies.length === 0) {
    return (
      <div
        className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 mb-2"
        style={{ background: "#0A1A0A", border: "1px solid #14532D", color: "#86EFAC" }}
      >
        <span>✓</span>
        {isRu ? "Аномалий не обнаружено" : "Anomaliyalar topilmadi"}
      </div>
    );
  }

  return <div className="mb-2"><AnomalyAlerts anomalies={anomalies} isRu={isRu} /></div>;
}
