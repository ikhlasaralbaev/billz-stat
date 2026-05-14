"use client";

import type { Anomaly, AnomalySeverity } from "@/types/anomaly";

interface AnomalyAlertsProps {
  anomalies: Anomaly[];
  isRu: boolean;
  title?: string;
}

function severityIcon(severity: AnomalySeverity): string {
  if (severity === "critical") return "🔴";
  if (severity === "warning") return "🟡";
  return "🔵";
}

function severityBorder(severity: AnomalySeverity): string {
  if (severity === "critical") return "#7F1D1D";
  if (severity === "warning") return "#78350F";
  return "#1E3A5F";
}

function severityBg(severity: AnomalySeverity): string {
  if (severity === "critical") return "#1A0A0A";
  if (severity === "warning") return "#1A1200";
  return "#0A0F1E";
}

function severityEntityColor(severity: AnomalySeverity): string {
  if (severity === "critical") return "#FCA5A5";
  if (severity === "warning") return "#FCD34D";
  return "#93C5FD";
}

export default function AnomalyAlerts({
  anomalies,
  isRu,
  title,
}: AnomalyAlertsProps) {
  if (anomalies.length === 0) return null;

  const heading = title ?? (isRu ? "Аномалии" : "Anomaliyalar");

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "#0A0F1E", border: "1px solid #1E293B" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">⚠️</span>
          <h3 className="text-sm font-semibold text-white">{heading}</h3>
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: "#1E293B", color: "#94A3B8" }}
        >
          {anomalies.length}
        </span>
      </div>

      {/* Carousel — 1 card on mobile, 2 on sm, 3 on lg */}
      <div
        className="flex overflow-x-auto gap-3 pb-1"
        style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
      >
        {anomalies.map((anomaly, idx) => (
          <div
            key={idx}
            className="shrink-0 w-full sm:w-[calc(50%-6px)] lg:w-[calc(33.333%-8px)] rounded-xl p-3"
            style={{
              scrollSnapAlign: "start",
              background: severityBg(anomaly.severity),
              border: `1px solid ${severityBorder(anomaly.severity)}`,
            }}
          >
            <div className="flex items-start gap-2">
              <span className="text-xs mt-0.5 shrink-0">
                {severityIcon(anomaly.severity)}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="text-xs font-bold mb-0.5 truncate"
                  style={{ color: severityEntityColor(anomaly.severity) }}
                >
                  {anomaly.entityName}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "#CBD5E1" }}>
                  {anomaly.message}
                </p>
                {anomaly.recommendation && (
                  <p
                    className="text-xs leading-relaxed mt-1"
                    style={{ color: "#64748B" }}
                  >
                    {anomaly.recommendation}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {anomalies.length > 1 && (
        <p className="text-xs mt-2 text-center" style={{ color: "#334155" }}>
          {isRu ? "Листайте →" : "Suring →"}
        </p>
      )}
    </div>
  );
}
