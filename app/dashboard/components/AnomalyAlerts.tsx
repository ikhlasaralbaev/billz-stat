"use client";

import { useState } from "react";
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

function severityStyle(severity: AnomalySeverity): React.CSSProperties {
  if (severity === "critical") {
    return { background: "#1A0A0A", border: "1px solid #7F1D1D" };
  }
  if (severity === "warning") {
    return { background: "#1A1200", border: "1px solid #78350F" };
  }
  return { background: "#0A0F1E", border: "1px solid #1E3A5F" };
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
  const [expanded, setExpanded] = useState(false);

  if (anomalies.length === 0) return null;

  const INITIAL_SHOW = 3;
  const visible = expanded ? anomalies : anomalies.slice(0, INITIAL_SHOW);
  const hasMore = anomalies.length > INITIAL_SHOW;

  const heading =
    title ?? (isRu ? "Аномалии" : "Anomaliyalar");

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

      {/* Anomaly cards */}
      <div>
        {visible.map((anomaly, idx) => (
          <div
            key={idx}
            className="rounded-xl p-3 mb-2 last:mb-0"
            style={severityStyle(anomaly.severity)}
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

      {/* Show more / less toggle */}
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 w-full text-xs py-1.5 rounded-lg transition-colors"
          style={{ color: "#64748B", background: "#111827" }}
        >
          {expanded
            ? isRu
              ? "Скрыть"
              : "Yashirish"
            : isRu
            ? `Показать ещё ${anomalies.length - INITIAL_SHOW}`
            : `Yana ${anomalies.length - INITIAL_SHOW} ta ko'rsatish`}
        </button>
      )}
    </div>
  );
}
