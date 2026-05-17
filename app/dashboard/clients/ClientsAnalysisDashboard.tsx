"use client";

import { useState } from "react";
import { runClientsAnalysis, ClientsAnalysisResult } from "./clientsAnalysisAction";

const fmtN = (n: number) =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const fmtUZS = (n: number) => fmtN(n) + " UZS";
const fmtPct = (n: number) => (Math.round(n * 10) / 10).toFixed(1) + "%";

const SEG_COLOR: Record<string, string> = {
  indigo: "#818CF8",
  emerald: "#34D399",
  amber: "#FBBF24",
  rose: "#F87171",
  slate: "#64748B",
};

const INSIGHT_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  success:     { bg: "#0A1F12", border: "#166534", color: "#34D399" },
  warning:     { bg: "#1C1005", border: "#92400E", color: "#FBBF24" },
  opportunity: { bg: "#0C1A3A", border: "#1E40AF", color: "#60A5FA" },
  risk:        { bg: "#1C0505", border: "#991B1B", color: "#F87171" },
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: "#F87171",
  high:     "#FB923C",
  medium:   "#FBBF24",
  low:      "#64748B",
};

const CAT_LABEL_RU: Record<string, string> = {
  retention:    "Удержание",
  acquisition:  "Привлечение",
  reactivation: "Реактивация",
  loyalty:      "Лояльность",
  revenue:      "Выручка",
};
const CAT_LABEL_UZ: Record<string, string> = {
  retention:    "Saqlash",
  acquisition:  "Jalb etish",
  reactivation: "Qaytarish",
  loyalty:      "Sadoqat",
  revenue:      "Daromad",
};

function Spinner() {
  return (
    <>
      <span
        style={{
          display: "inline-block",
          width: 12,
          height: 12,
          borderRadius: "50%",
          border: "2px solid #1E293B",
          borderTopColor: "#6366F1",
          animation: "spin 0.7s linear infinite",
          flexShrink: 0,
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

function fmtAnalyzedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

function StatusDot({ status }: { status: "active" | "at_risk" | "lost" }) {
  const c = status === "active" ? "#34D399" : status === "at_risk" ? "#FB923C" : "#F87171";
  return (
    <span
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: c,
        flexShrink: 0,
      }}
    />
  );
}

function HealthBadge({ health, isRu }: { health: string; isRu: boolean }) {
  const cfg =
    health === "growing"
      ? { bg: "#052E16", border: "#166534", color: "#34D399", label: isRu ? "Растёт" : "O'smoqda" }
      : health === "declining"
      ? { bg: "#1C0505", border: "#991B1B", color: "#F87171", label: isRu ? "Падает" : "Tushmoqda" }
      : { bg: "#1C1005", border: "#92400E", color: "#FBBF24", label: isRu ? "Стабильно" : "Barqaror" };
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      className="rounded-xl p-3.5 flex flex-col gap-1"
      style={{ background: "#0D1526", border: "1px solid #1E293B" }}
    >
      <span className="text-xs" style={{ color: "#475569" }}>
        {label}
      </span>
      <span
        className="text-lg font-bold leading-tight"
        style={{ color: accent ?? "#E2E8F0" }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: "#334155" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function MonthlyBarChart({
  data,
  label,
  color,
  formatValue,
}: {
  data: Array<{ month: string; value: number }>;
  label: string;
  color: string;
  formatValue: (n: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <div className="text-xs font-medium mb-3" style={{ color: "#64748B" }}>
        {label}
      </div>
      <div className="flex items-end gap-0.5" style={{ height: 72 }}>
        {data.map((d) => (
          <div
            key={d.month}
            className="flex-1 flex flex-col items-center gap-1 group relative"
            title={`${d.month}: ${formatValue(d.value)}`}
          >
            <div
              className="w-full rounded-t-sm"
              style={{
                height: `${Math.max(2, (d.value / max) * 60)}px`,
                background: d.value === 0 ? "#1E293B" : color,
              }}
            />
            <span style={{ color: "#334155", fontSize: 9, lineHeight: 1 }}>
              {d.month.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SegmentRow({
  name,
  count,
  percentage,
  avgSpend,
  description,
  color,
  total,
}: {
  name: string;
  count: number;
  percentage: number;
  avgSpend: number;
  description: string;
  color: string;
  total: number;
}) {
  const barPct = total > 0 ? Math.round((count / total) * 100) : percentage;
  const c = SEG_COLOR[color] ?? "#64748B";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: c }}
          />
          <span className="text-sm font-medium text-white truncate">{name}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs">
          <span style={{ color: "#64748B" }}>{fmtN(count)}</span>
          <span style={{ color: c }}>{barPct}%</span>
          <span style={{ color: "#475569" }}>{fmtUZS(avgSpend)}</span>
        </div>
      </div>
      <div className="w-full rounded-full" style={{ background: "#1E293B", height: 5 }}>
        <div
          className="rounded-full"
          style={{ width: `${Math.min(100, barPct)}%`, background: c, height: 5 }}
        />
      </div>
      <p className="text-xs" style={{ color: "#475569" }}>
        {description}
      </p>
    </div>
  );
}

export default function ClientsAnalysisDashboard({
  initialAnalysis,
  analyzedAt: initialAnalyzedAt,
  isRu,
}: {
  initialAnalysis: ClientsAnalysisResult | null;
  analyzedAt: string | null;
  isRu: boolean;
}) {
  const [analysis, setAnalysis] = useState<ClientsAnalysisResult | null>(initialAnalysis);
  const [analyzedAt, setAnalyzedAt] = useState(initialAnalyzedAt);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  async function handlePdfDownload() {
    setPdfDownloading(true);
    try {
      const res = await fetch("/api/clients/analysis-pdf");
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `clients-analysis-${date}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — PDF is not critical
    } finally {
      setPdfDownloading(false);
    }
  }

  async function handleAnalyze() {
    setStatus("loading");
    setErrorMsg(null);
    try {
      const result = await runClientsAnalysis();
      setAnalysis(result);
      setAnalyzedAt(new Date().toISOString());
      setStatus("idle");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  const s = analysis?.summary;
  const catLabel = isRu ? CAT_LABEL_RU : CAT_LABEL_UZ;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "#0D1526", border: "1px solid #1E293B" }}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">
                {isRu ? "Анализ клиентской базы" : "Mijozlar bazasi tahlili"}
              </span>
              {s && (
                <HealthBadge health={s.overallHealth} isRu={isRu} />
              )}
            </div>
            {analyzedAt ? (
              <p className="text-xs" style={{ color: "#475569" }}>
                {isRu ? "Обновлено" : "Yangilangan"}: {fmtAnalyzedAt(analyzedAt)}
                {s && (
                  <span style={{ color: "#334155" }}>
                    {" "}· {fmtN(s.totalClients)} {isRu ? "клиентов" : "ta mijoz"}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs" style={{ color: "#475569" }}>
                {isRu
                  ? "Анализ ещё не выполнен. Синхронизируйте данные для получения анализа."
                  : "Tahlil hali bajarilmagan. Ma'lumotlarni sinxronlang."}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {analysis && (
              <button
                onClick={handlePdfDownload}
                disabled={pdfDownloading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
                style={{
                  background: "#0D1526",
                  border: "1px solid #1E293B",
                  color: pdfDownloading ? "#475569" : "#64748B",
                  cursor: pdfDownloading ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => { if (!pdfDownloading) { e.currentTarget.style.color = "#94A3B8"; e.currentTarget.style.borderColor = "#334155"; }}}
                onMouseLeave={(e) => { e.currentTarget.style.color = pdfDownloading ? "#475569" : "#64748B"; e.currentTarget.style.borderColor = "#1E293B"; }}
              >
                {pdfDownloading ? (
                  <>
                    <Spinner />
                    <span>PDF...</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 12 }}>⬇</span>
                    <span>PDF</span>
                  </>
                )}
              </button>
            )}
            <button
            onClick={handleAnalyze}
            disabled={status === "loading"}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors"
            style={{
              background: "#1E1B4B",
              border: "1px solid #312E81",
              color: status === "loading" ? "#64748B" : "#A5B4FC",
              cursor: status === "loading" ? "not-allowed" : "pointer",
            }}
          >
            {status === "loading" ? (
              <>
                <Spinner />
                <span>{isRu ? "Анализирую..." : "Tahlil qilinmoqda..."}</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: 13 }}>✦</span>
                <span>
                  {analysis
                    ? isRu
                      ? "Обновить анализ"
                      : "Tahlilni yangilash"
                    : isRu
                    ? "Запустить анализ"
                    : "Tahlil boshlash"}
                </span>
              </>
            )}
          </button>
          </div>
        </div>

        {status === "error" && errorMsg && (
          <div
            className="mt-3 px-3 py-2 rounded-lg text-xs"
            style={{ background: "#1C0505", border: "1px solid #7F1D1D", color: "#F87171" }}
          >
            {errorMsg}
          </div>
        )}
      </div>

      {!analysis ? null : (
        <>
          {/* Alerts */}
          {(analysis.alerts?.length ?? 0) > 0 && (
            <div className="space-y-2">
              {analysis.alerts.map((alert, i) => {
                const c =
                  alert.severity === "critical"
                    ? "#F87171"
                    : alert.severity === "high"
                    ? "#FB923C"
                    : "#FBBF24";
                return (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm"
                    style={{
                      background: "#0D1526",
                      borderLeft: `3px solid ${c}`,
                      border: `1px solid #1E293B`,
                      borderLeftColor: c,
                    }}
                  >
                    <span style={{ color: c, fontSize: 15, lineHeight: 1.4 }}>⚠</span>
                    <span style={{ color: "#CBD5E1" }}>{alert.message}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Health banner */}
          {analysis.trends?.summary && (
            <div
              className="px-4 py-3 rounded-xl text-sm"
              style={{ background: "#0D1526", border: "1px solid #1E293B" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold" style={{ color: "#A5B4FC" }}>
                  {isRu ? "Общая динамика" : "Umumiy dinamika"}
                </span>
                {s && (
                  <span className="text-xs font-bold" style={{ color: "#6366F1" }}>
                    {s.healthScore}/100
                  </span>
                )}
              </div>
              <p style={{ color: "#94A3B8" }}>{analysis.trends.summary}</p>
            </div>
          )}

          {/* Summary cards */}
          {s && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <SummaryCard
                label={isRu ? "Всего клиентов" : "Jami mijozlar"}
                value={fmtN(s.totalClients)}
                sub={`+${fmtN(s.newClients30d)} ${isRu ? "за 30д" : "30 kunda"}`}
              />
              <SummaryCard
                label={isRu ? "Активных (30д)" : "Faol (30 kun)"}
                value={fmtN(s.activeClients30d)}
                sub={`${Math.round((s.activeClients30d / Math.max(s.totalClients, 1)) * 100)}% ${isRu ? "от базы" : "bazadan"}`}
                accent="#34D399"
              />
              <SummaryCard
                label={isRu ? "Под угрозой (30-90д)" : "Xavf ostida (30-90 kun)"}
                value={fmtN(s.atRiskClients)}
                sub={`${Math.round((s.atRiskClients / Math.max(s.totalClients, 1)) * 100)}%`}
                accent="#FB923C"
              />
              <SummaryCard
                label={isRu ? "Потеряны (90д+)" : "Yo'qolgan (90 kun+)"}
                value={fmtN(s.lostClients)}
                sub={`${Math.round((s.lostClients / Math.max(s.totalClients, 1)) * 100)}%`}
                accent="#F87171"
              />
              <SummaryCard
                label={isRu ? "Ср. чек" : "O'rtacha chek"}
                value={fmtUZS(s.avgOrderValue)}
                sub={`${s.avgOrdersPerClient.toFixed(1)} ${isRu ? "заказов/клиент" : "buyurtma/mijoz"}`}
                accent="#A5B4FC"
              />
              <SummaryCard
                label={isRu ? "Повторные покупки" : "Takroriy xaridlar"}
                value={fmtPct(s.repeatPurchaseRate)}
                sub={isRu ? "клиентов с 2+ заказами" : "2+ buyurtmali mijozlar"}
                accent="#818CF8"
              />
            </div>
          )}

          {/* Trends charts */}
          {(analysis.trends?.monthlyRevenue?.length || analysis.trends?.monthlyNewClients?.length) ? (
            <div
              className="rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-6"
              style={{ background: "#0D1526", border: "1px solid #1E293B" }}
            >
              {analysis.trends.monthlyRevenue?.length > 0 && (
                <MonthlyBarChart
                  data={analysis.trends.monthlyRevenue.map((m) => ({
                    month: m.month,
                    value: m.amount,
                  }))}
                  label={isRu ? "Выручка по месяцам" : "Oylik daromad"}
                  color="#6366F1"
                  formatValue={fmtUZS}
                />
              )}
              {analysis.trends.monthlyNewClients?.length > 0 && (
                <MonthlyBarChart
                  data={analysis.trends.monthlyNewClients.map((m) => ({
                    month: m.month,
                    value: m.count,
                  }))}
                  label={isRu ? "Новые клиенты по месяцам" : "Oylik yangi mijozlar"}
                  color="#34D399"
                  formatValue={(n) => fmtN(n)}
                />
              )}
              {analysis.trends.peakMonth && (
                <div className="sm:col-span-2 flex flex-wrap gap-4 text-xs pt-1 border-t" style={{ borderColor: "#1E293B" }}>
                  <span style={{ color: "#475569" }}>
                    {isRu ? "Пик выручки" : "Eng yuqori daromad"}:{" "}
                    <span style={{ color: "#A5B4FC" }}>{analysis.trends.peakMonth}</span>
                  </span>
                  {analysis.trends.recentGrowthRate !== 0 && (
                    <span style={{ color: "#475569" }}>
                      {isRu ? "Рост новых клиентов (30д)" : "Yangi mijozlar o'sishi (30 kun)"}:{" "}
                      <span
                        style={{
                          color: analysis.trends.recentGrowthRate > 0 ? "#34D399" : "#F87171",
                        }}
                      >
                        {analysis.trends.recentGrowthRate > 0 ? "+" : ""}
                        {analysis.trends.recentGrowthRate.toFixed(1)}%
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* Segments */}
          {(analysis.segments?.length ?? 0) > 0 && (
            <div
              className="rounded-2xl p-4 space-y-4"
              style={{ background: "#0D1526", border: "1px solid #1E293B" }}
            >
              <h3 className="text-xs font-semibold" style={{ color: "#64748B" }}>
                {isRu ? "Сегменты клиентов" : "Mijozlar segmentlari"}
              </h3>
              <div className="space-y-5">
                {analysis.segments.map((seg, i) => (
                  <SegmentRow
                    key={i}
                    {...seg}
                    total={s?.totalClients ?? 0}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Top clients + Win-back */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top clients */}
            {(analysis.topClients?.length ?? 0) > 0 && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid #1E293B" }}
              >
                <div
                  className="px-4 py-3 text-xs font-semibold"
                  style={{ background: "#0D1526", color: "#64748B", borderBottom: "1px solid #1E293B" }}
                >
                  {isRu ? "Топ клиентов по выручке" : "Eng yaxshi mijozlar"}
                </div>
                <div className="divide-y" style={{ borderColor: "#0D1526" }}>
                  {analysis.topClients.slice(0, 10).map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-2.5"
                      style={{ background: i % 2 === 0 ? "#070B14" : "#0A0F1E" }}
                    >
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          background: i < 3 ? "#1E1B4B" : "#0D1526",
                          color: i < 3 ? "#A5B4FC" : "#334155",
                        }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <StatusDot status={c.status} />
                          <span className="text-sm text-white truncate">{c.name}</span>
                        </div>
                        <span className="text-xs" style={{ color: "#334155" }}>
                          {c.phone}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold" style={{ color: "#A5B4FC" }}>
                          {fmtUZS(c.totalSpend)}
                        </div>
                        <div className="text-xs" style={{ color: "#334155" }}>
                          {c.orderCount} {isRu ? "зак." : "buy."} · {c.daysSinceLastPurchase}
                          {isRu ? "д" : "k"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Win-back candidates */}
            {(analysis.winbackCandidates?.length ?? 0) > 0 && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid #1E293B" }}
              >
                <div
                  className="px-4 py-3 text-xs font-semibold"
                  style={{
                    background: "#0D1526",
                    color: "#64748B",
                    borderBottom: "1px solid #1E293B",
                  }}
                >
                  {isRu
                    ? "Клиенты для реактивации"
                    : "Qayta jalb qilish kerak bo'lgan mijozlar"}
                </div>
                <div className="divide-y" style={{ borderColor: "#0D1526" }}>
                  {analysis.winbackCandidates.map((c, i) => (
                    <div
                      key={i}
                      className="px-4 py-3 space-y-1.5"
                      style={{ background: i % 2 === 0 ? "#070B14" : "#0A0F1E" }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: "#F87171" }}
                            />
                            <span className="text-sm text-white truncate">{c.name}</span>
                          </div>
                          <span className="text-xs" style={{ color: "#334155" }}>
                            {c.phone}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-semibold" style={{ color: "#A5B4FC" }}>
                            {fmtUZS(c.totalSpend)}
                          </div>
                          <div className="text-xs" style={{ color: "#FB923C" }}>
                            {c.daysSinceLastPurchase} {isRu ? "дн. назад" : "kun oldin"}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs" style={{ color: "#64748B", lineHeight: 1.5 }}>
                        {c.strategy}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Insights */}
          {(analysis.insights?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold px-1" style={{ color: "#475569" }}>
                {isRu ? "Ключевые наблюдения" : "Asosiy kuzatuvlar"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysis.insights.map((ins, i) => {
                  const style = INSIGHT_STYLE[ins.type] ?? INSIGHT_STYLE.opportunity;
                  return (
                    <div
                      key={i}
                      className="rounded-xl p-3.5 space-y-1"
                      style={{
                        background: style.bg,
                        border: `1px solid ${style.border}`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ color: style.color, fontSize: 13 }}>
                          {ins.type === "success"
                            ? "✓"
                            : ins.type === "warning"
                            ? "⚠"
                            : ins.type === "risk"
                            ? "✕"
                            : "→"}
                        </span>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: style.color }}
                        >
                          {ins.title}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>
                        {ins.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {(analysis.recommendations?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold px-1" style={{ color: "#475569" }}>
                {isRu ? "Рекомендации" : "Tavsiyalar"}
              </h3>
              <div className="space-y-3">
                {analysis.recommendations.map((rec, i) => {
                  const pc = PRIORITY_COLOR[rec.priority] ?? "#64748B";
                  return (
                    <div
                      key={i}
                      className="rounded-xl p-4 space-y-2"
                      style={{ background: "#0D1526", border: "1px solid #1E293B" }}
                    >
                      <div className="flex items-start gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0 mt-0.5"
                            style={{ background: pc }}
                          />
                          <span className="text-sm font-semibold text-white">{rec.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className="px-2 py-0.5 rounded-md text-xs font-medium"
                            style={{ background: "#1E293B", color: pc }}
                          >
                            {rec.priority}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-md text-xs"
                            style={{ background: "#1E293B", color: "#64748B" }}
                          >
                            {catLabel[rec.category] ?? rec.category}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>
                        {rec.description}
                      </p>
                      {rec.expectedImpact && (
                        <p className="text-xs" style={{ color: "#475569" }}>
                          <span style={{ color: "#334155" }}>
                            {isRu ? "Ожидаемый эффект: " : "Kutilayotgan natija: "}
                          </span>
                          {rec.expectedImpact}
                        </p>
                      )}
                      {rec.actionSteps?.length > 0 && (
                        <ul className="space-y-1 pt-1">
                          {rec.actionSteps.map((step, j) => (
                            <li
                              key={j}
                              className="flex items-start gap-2 text-xs"
                              style={{ color: "#64748B" }}
                            >
                              <span
                                className="shrink-0 mt-0.5"
                                style={{ color: "#334155" }}
                              >
                                {j + 1}.
                              </span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loyalty metrics */}
          {analysis.loyaltyMetrics && (
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{ background: "#0D1526", border: "1px solid #1E293B" }}
            >
              <h3 className="text-xs font-semibold" style={{ color: "#64748B" }}>
                {isRu ? "Метрики лояльности" : "Sadoqat ko'rsatkichlari"}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <div className="text-xs" style={{ color: "#475569" }}>
                    {isRu ? "Повторные покупки" : "Takroriy xaridlar"}
                  </div>
                  <div className="text-base font-bold" style={{ color: "#A5B4FC" }}>
                    {fmtPct(analysis.loyaltyMetrics.repeatPurchaseRate)}
                  </div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: "#475569" }}>
                    {isRu ? "VIP клиентов" : "VIP mijozlar"}
                  </div>
                  <div className="text-base font-bold" style={{ color: "#FBBF24" }}>
                    {fmtN(analysis.loyaltyMetrics.vipClientCount)}
                  </div>
                  <div className="text-xs" style={{ color: "#334155" }}>
                    &gt; {fmtUZS(analysis.loyaltyMetrics.vipThreshold)}
                  </div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: "#475569" }}>
                    {isRu ? "Частота покупок" : "Xarid chastotasi"}
                  </div>
                  <div className="text-base font-bold" style={{ color: "#34D399" }}>
                    {analysis.loyaltyMetrics.avgPurchaseFrequencyDays}
                    <span className="text-xs font-normal ml-1" style={{ color: "#475569" }}>
                      {isRu ? "дн." : "kun"}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: "#475569" }}>
                    {isRu ? "Возвраты" : "Qaytarishlar"}
                  </div>
                  <div
                    className="text-base font-bold"
                    style={{ color: s && s.returnRate > 5 ? "#F87171" : "#64748B" }}
                  >
                    {s ? fmtPct(s.returnRate) : "—"}
                  </div>
                </div>
              </div>
              {analysis.loyaltyMetrics.retentionInsight && (
                <p
                  className="text-xs leading-relaxed pt-2 border-t"
                  style={{ borderColor: "#1E293B", color: "#64748B" }}
                >
                  {analysis.loyaltyMetrics.retentionInsight}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
