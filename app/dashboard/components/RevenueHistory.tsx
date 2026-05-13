import { TrendingUp, TrendingDown } from "lucide-react";
import { IReport } from "@/models/Report";

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("uz-UZ", { notation: "compact", maximumFractionDigits: 1 }).format(
    Math.round(n)
  );

export default function RevenueHistory({ reports, isRu }: { reports: IReport[]; isRu: boolean }) {
  const sorted = [...reports].reverse();
  const maxVal = Math.max(...sorted.map((r) => r.today.netGrossSales), 1);

  return (
    <div
      className="rounded-2xl p-5 space-y-4 h-full"
      style={{ background: "#0D1526", border: "1px solid #1E293B" }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "#6366F118" }}
        >
          <TrendingUp size={14} style={{ color: "#6366F1" }} />
        </div>
        <h3 className="text-sm font-semibold text-white">
          {isRu ? "История выручки — 7 дней" : "Daromad tarixi — 7 kun"}
        </h3>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs py-8 text-center" style={{ color: "#334155" }}>
          {isRu ? "Недостаточно данных" : "Ma'lumot yetarli emas"}
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.map((report, i) => {
            const val = report.today.netGrossSales;
            const pct = (val / maxVal) * 100;
            const date = new Date(report.today.date ?? report.createdAt);
            const label = date.toLocaleDateString(isRu ? "ru-RU" : "uz-UZ", {
              day: "numeric", month: "short",
            });
            const isLatest = i === sorted.length - 1;
            return (
              <div key={report._id?.toString() ?? i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span style={{ color: "#64748B" }}>{label}</span>
                  <span className="font-medium" style={{ color: isLatest ? "#A5B4FC" : "#94A3B8" }}>
                    {fmtCompact(val)} UZS
                  </span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "#0F172A" }}>
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: isLatest
                        ? "linear-gradient(90deg, #6366F1, #8B5CF6)"
                        : "#1E3A5F",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sorted.length > 1 && (() => {
        const latest = sorted[sorted.length - 1];
        const prev = sorted[sorted.length - 2];
        const diff =
          prev.today.netGrossSales > 0
            ? ((latest.today.netGrossSales - prev.today.netGrossSales) / prev.today.netGrossSales) * 100
            : 0;
        const isUp = diff >= 0;
        const Icon = isUp ? TrendingUp : TrendingDown;
        return (
          <div
            className="rounded-lg px-3 py-2 flex justify-between items-center text-xs"
            style={{ background: "#0A1020" }}
          >
            <span style={{ color: "#64748B" }}>{isRu ? "vs вчера" : "vs kecha"}</span>
            <div className="flex items-center gap-1" style={{ color: isUp ? "#34D399" : "#F87171" }}>
              <Icon size={11} />
              <span className="font-semibold">{Math.abs(diff).toFixed(1)}%</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
