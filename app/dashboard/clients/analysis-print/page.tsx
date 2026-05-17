import { getDashboardUser } from "@/lib/dashboard";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { getLatestClientsAnalysis, ClientsAnalysisResult } from "../clientsAnalysisAction";
import PrintTrigger from "./PrintTrigger";
import PrintControls from "./PrintControls";

const sp = (n: number) =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const uzs = (n: number) => sp(n) + " UZS";
const pct = (n: number) => n.toFixed(1) + "%";

const MONTHS_RU = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
const MONTHS_UZ = ["yan","fev","mar","apr","may","iyn","iyl","avg","sen","okt","noy","dek"];

function fmtDate(iso: string, isRu: boolean): string {
  const d = new Date(iso);
  const m = isRu ? MONTHS_RU : MONTHS_UZ;
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}, ${h}:${min}`;
}

const HEALTH_CFG = {
  growing:   { bg: "#D1FAE5", color: "#065F46", labelRu: "Рост ↑",       labelUz: "O'smoqda ↑" },
  stable:    { bg: "#FEF3C7", color: "#78350F", labelRu: "Стабильно →",  labelUz: "Barqaror →" },
  declining: { bg: "#FEE2E2", color: "#7F1D1D", labelRu: "Снижение ↓",   labelUz: "Tushmoqda ↓" },
};

const INSIGHT_CFG = {
  success:     { bg: "#D1FAE5", border: "#059669", color: "#065F46", sym: "✓" },
  warning:     { bg: "#FEF3C7", border: "#D97706", color: "#78350F", sym: "!" },
  opportunity: { bg: "#DBEAFE", border: "#2563EB", color: "#1E40AF", sym: "→" },
  risk:        { bg: "#FEE2E2", border: "#DC2626", color: "#7F1D1D", sym: "✕" },
};

const PRI_COLOR: Record<string, string> = {
  critical: "#7F1D1D",
  high: "#92400E",
  medium: "#713F12",
  low: "#475569",
};

const CAT_RU: Record<string, string> = {
  retention: "Удержание", acquisition: "Привлечение",
  reactivation: "Реактивация", loyalty: "Лояльность", revenue: "Выручка",
};
const CAT_UZ: Record<string, string> = {
  retention: "Saqlash", acquisition: "Jalb etish",
  reactivation: "Qaytarish", loyalty: "Sadoqat", revenue: "Daromad",
};

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    color: #1E293B; background: #F1F5F9; font-size: 13px; line-height: 1.5;
  }
  .wrap {
    max-width: 960px; margin: 24px auto; background: white;
    padding: 52px 56px; border-radius: 8px; box-shadow: 0 4px 32px rgba(0,0,0,.12);
  }
  h2 {
    font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
    color: #6366F1; margin-bottom: 14px; padding-bottom: 6px;
    border-bottom: 2px solid #E0E7FF;
  }
  section { margin-bottom: 32px; }
  table { width: 100%; border-collapse: collapse; }
  th {
    background: #F8FAFC; text-align: left; padding: 8px 10px;
    font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase;
    letter-spacing: .04em; border-bottom: 2px solid #E2E8F0;
  }
  td { padding: 8px 10px; border-bottom: 1px solid #F1F5F9; vertical-align: top; font-size: 12px; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #FAFBFC; }
  .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .card {
    padding: 14px 16px; border: 1px solid #E2E8F0; border-radius: 8px;
    border-left: 3px solid #6366F1;
  }
  .card-label { font-size: 10px; color: #64748B; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .04em; }
  .card-value { font-size: 20px; font-weight: 800; }
  .card-sub { font-size: 10px; color: #94A3B8; margin-top: 3px; }
  .badge {
    display: inline-block; font-size: 10px; font-weight: 700;
    padding: 2px 8px; border-radius: 4px; white-space: nowrap;
  }
  .insight-box { padding: 10px 14px; border-radius: 6px; border-left: 3px solid; margin-bottom: 8px; }
  .rec-box { border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; }
  .rec-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
  .rec-title { font-weight: 700; font-size: 13px; flex: 1; }
  .rec-desc { color: #334155; margin-bottom: 6px; font-size: 12px; line-height: 1.65; }
  .rec-impact { font-size: 11px; color: #64748B; margin-bottom: 6px; }
  .steps { padding-left: 18px; margin-top: 6px; }
  .steps li { font-size: 11px; color: #475569; margin-bottom: 3px; line-height: 1.5; }
  .status-badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; }
  @media screen { .no-print { display: flex; } }
  @media print {
    @page { margin: 1.5cm 2cm; size: A4 portrait; }
    body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .wrap { margin: 0; padding: 0; box-shadow: none; border-radius: 0; max-width: 100%; }
    .page-break { page-break-before: always; break-before: page; }
    section { page-break-inside: avoid; break-inside: avoid; }
    .rec-box { page-break-inside: avoid; break-inside: avoid; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; break-inside: avoid; }
  }
`;

export default async function AnalysisPrintPage() {
  const user = await getDashboardUser();
  if (!user) redirect("/auth/error");

  const isRu = getLang(user) === "ru";
  const { result: a, analyzedAt } = await getLatestClientsAnalysis();
  const CAT = isRu ? CAT_RU : CAT_UZ;

  if (!a) {
    return (
      <html lang={isRu ? "ru" : "uz"}>
        <body style={{ fontFamily: "system-ui, sans-serif", padding: 40, color: "#475569" }}>
          {isRu
            ? "Анализ не найден. Вернитесь на страницу клиентов и запустите анализ."
            : "Tahlil topilmadi. Mijozlar sahifasiga qayting va tahlil boshlang."}
        </body>
      </html>
    );
  }

  const s = a.summary;
  const health = (s.overallHealth ?? "stable") as keyof typeof HEALTH_CFG;
  const hcfg = HEALTH_CFG[health] ?? HEALTH_CFG.stable;
  const dateStr = analyzedAt ? fmtDate(analyzedAt, isRu) : "—";

  return (
    <html lang={isRu ? "ru" : "uz"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{isRu ? "Анализ клиентской базы" : "Mijozlar bazasi tahlili"} — Billz Analytics</title>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </head>
      <body>
        <PrintTrigger />
        <PrintControls isRu={isRu} />

        <div className="wrap">

          {/* ── Cover header ─────────────────────────────────── */}
          <div style={{ marginBottom: 36, paddingBottom: 24, borderBottom: "3px solid #6366F1", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#6366F1", marginBottom: 8 }}>
                Billz Analytics
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", lineHeight: 1.2, marginBottom: 8 }}>
                {isRu ? "Анализ клиентской базы" : "Mijozlar bazasi tahlili"}
              </h1>
              <p style={{ fontSize: 12, color: "#64748B" }}>
                {isRu ? "Сформировано:" : "Yaratilgan:"} {dateStr}
                <span style={{ margin: "0 8px", color: "#CBD5E1" }}>·</span>
                {sp(s.totalClients)} {isRu ? "клиентов в базе" : "ta mijoz bazada"}
              </p>
            </div>
            <div style={{ textAlign: "center", padding: "14px 22px", borderRadius: 10, background: hcfg.bg, flexShrink: 0 }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: hcfg.color, lineHeight: 1 }}>{s.healthScore}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: hcfg.color, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 2 }}>/ 100</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: hcfg.color, marginTop: 4 }}>
                {isRu ? hcfg.labelRu : hcfg.labelUz}
              </div>
            </div>
          </div>

          {/* ── Key metrics ──────────────────────────────────── */}
          <section>
            <h2>{isRu ? "Ключевые показатели" : "Asosiy ko'rsatkichlar"}</h2>
            <div className="grid3" style={{ marginBottom: 12 }}>
              {[
                { label: isRu ? "Всего клиентов" : "Jami mijozlar",         value: sp(s.totalClients),       sub: `+${sp(s.newClients30d)} ${isRu ? "за 30 дн." : "30 kunda"}`,               accent: "#6366F1" },
                { label: isRu ? "Активных (30д)" : "Faol (30 kun)",         value: sp(s.activeClients30d),   sub: `${Math.round(s.activeClients30d / Math.max(s.totalClients, 1) * 100)}% ${isRu ? "от базы" : "bazadan"}`, accent: "#059669" },
                { label: isRu ? "Новых (30д)" : "Yangi (30 kun)",           value: sp(s.newClients30d),      sub: `${sp(s.newClients90d)} ${isRu ? "за 90 дн." : "90 kunda"}`,               accent: "#2563EB" },
                { label: isRu ? "Под угрозой (30-90д)" : "Xavf ostida",     value: sp(s.atRiskClients),      sub: `${Math.round(s.atRiskClients / Math.max(s.totalClients, 1) * 100)}%`,       accent: "#D97706" },
                { label: isRu ? "Потеряны (90д+)" : "Yo'qolgan (90k+)",     value: sp(s.lostClients),        sub: `${Math.round(s.lostClients / Math.max(s.totalClients, 1) * 100)}%`,         accent: "#DC2626" },
                { label: isRu ? "Средний чек" : "O'rtacha chek",            value: uzs(s.avgOrderValue),     sub: `${s.avgOrdersPerClient.toFixed(1)} ${isRu ? "заказов/клиент" : "buyurtma/mijoz"}`, accent: "#7C3AED" },
              ].map(({ label, value, sub, accent }) => (
                <div key={label} className="card" style={{ borderLeftColor: accent }}>
                  <div className="card-label">{label}</div>
                  <div className="card-value" style={{ color: accent }}>{value}</div>
                  {sub && <div className="card-sub">{sub}</div>}
                </div>
              ))}
            </div>
            <div className="grid3">
              {[
                { label: isRu ? "Общая выручка (продажи)" : "Umumiy daromad (savdolar)", value: uzs(s.totalRevenue) },
                { label: isRu ? "Повторные покупки" : "Takroriy xaridlar",               value: pct(s.repeatPurchaseRate) },
                { label: isRu ? "Возвраты" : "Qaytarishlar",                             value: pct(s.returnRate) },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>{value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Trends ───────────────────────────────────────── */}
          {a.trends?.summary && (
            <section>
              <h2>{isRu ? "Динамика и тренды" : "Dinamika va trendlar"}</h2>
              <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.75, marginBottom: 16, padding: "12px 16px", background: "#F8FAFC", borderRadius: 6, borderLeft: "3px solid #6366F1" }}>
                {a.trends.summary}
              </p>
              {(a.trends.monthlyRevenue?.length ?? 0) > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>{isRu ? "Показатель" : "Ko'rsatkich"}</th>
                      {a.trends.monthlyRevenue.map(m => (
                        <th key={m.month} style={{ textAlign: "right" }}>
                          {(isRu ? MONTHS_RU : MONTHS_UZ)[parseInt(m.month.slice(5)) - 1]}&nbsp;{m.month.slice(2, 4)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600, fontSize: 11 }}>{isRu ? "Выручка (K UZS)" : "Daromad (K UZS)"}</td>
                      {a.trends.monthlyRevenue.map(m => (
                        <td key={m.month} style={{ textAlign: "right", fontSize: 11 }}>{sp(Math.round(m.amount / 1000))}</td>
                      ))}
                    </tr>
                    {(a.trends.monthlyNewClients?.length ?? 0) > 0 && (
                      <tr>
                        <td style={{ fontWeight: 600, fontSize: 11 }}>{isRu ? "Новых клиентов" : "Yangi mijozlar"}</td>
                        {a.trends.monthlyNewClients.map(m => (
                          <td key={m.month} style={{ textAlign: "right", fontSize: 11 }}>{m.count}</td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
              <div style={{ marginTop: 10, display: "flex", gap: 20, fontSize: 11, color: "#64748B" }}>
                {a.trends.peakMonth && (
                  <span>{isRu ? "Пик выручки" : "Eng yuqori daromad"}: <strong style={{ color: "#059669" }}>{a.trends.peakMonth}</strong></span>
                )}
                {a.trends.recentGrowthRate !== 0 && (
                  <span>
                    {isRu ? "Рост новых клиентов (30д)" : "Yangi mijozlar o'sishi (30k)"}:{" "}
                    <strong style={{ color: a.trends.recentGrowthRate > 0 ? "#059669" : "#DC2626" }}>
                      {a.trends.recentGrowthRate > 0 ? "+" : ""}{a.trends.recentGrowthRate.toFixed(1)}%
                    </strong>
                  </span>
                )}
              </div>
            </section>
          )}

          {/* ── Segments ─────────────────────────────────────── */}
          {(a.segments?.length ?? 0) > 0 && (
            <section>
              <h2>{isRu ? "Сегменты клиентов" : "Mijozlar segmentlari"}</h2>
              <table>
                <thead>
                  <tr>
                    <th>{isRu ? "Сегмент" : "Segment"}</th>
                    <th style={{ textAlign: "right" }}>{isRu ? "Кол-во" : "Soni"}</th>
                    <th style={{ textAlign: "right" }}>%</th>
                    <th style={{ textAlign: "right" }}>{isRu ? "Ср. чек" : "O'rt. chek"}</th>
                    <th>{isRu ? "Описание" : "Tavsif"}</th>
                  </tr>
                </thead>
                <tbody>
                  {a.segments.map((seg, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{seg.name}</td>
                      <td style={{ textAlign: "right" }}>{sp(seg.count)}</td>
                      <td style={{ textAlign: "right" }}>{seg.percentage}%</td>
                      <td style={{ textAlign: "right", color: "#4F46E5", fontWeight: 600 }}>{uzs(seg.avgSpend)}</td>
                      <td style={{ color: "#475569", fontSize: 11, lineHeight: 1.6 }}>{seg.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* ── Top clients ──────────────────────────────────── */}
          {(a.topClients?.length ?? 0) > 0 && (
            <section className="page-break">
              <h2>{isRu ? "Топ клиентов по выручке" : "Daromad bo'yicha top mijozlar"}</h2>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 28 }}>#</th>
                    <th>{isRu ? "Клиент" : "Mijoz"}</th>
                    <th>{isRu ? "Телефон" : "Telefon"}</th>
                    <th style={{ textAlign: "right" }}>{isRu ? "Сумма" : "Summa"}</th>
                    <th style={{ textAlign: "right" }}>{isRu ? "Заказы" : "Buyurtmalar"}</th>
                    <th style={{ textAlign: "right" }}>{isRu ? "Без покупки (дн.)" : "Xarid yo'q (kun)"}</th>
                    <th>{isRu ? "Статус" : "Holat"}</th>
                  </tr>
                </thead>
                <tbody>
                  {a.topClients.slice(0, 20).map((c, i) => {
                    const statusCfg =
                      c.status === "active"
                        ? { bg: "#D1FAE5", color: "#065F46", label: isRu ? "Активен" : "Faol" }
                        : c.status === "at_risk"
                        ? { bg: "#FEF3C7", color: "#78350F", label: isRu ? "В риске" : "Xavf" }
                        : { bg: "#FEE2E2", color: "#7F1D1D", label: isRu ? "Потерян" : "Yo'qolgan" };
                    return (
                      <tr key={i}>
                        <td style={{ color: "#94A3B8", fontSize: 11 }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td style={{ color: "#64748B", fontSize: 11 }}>{c.phone}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#4F46E5" }}>{uzs(c.totalSpend)}</td>
                        <td style={{ textAlign: "right" }}>{c.orderCount}</td>
                        <td style={{ textAlign: "right", fontWeight: 600, color: c.daysSinceLastPurchase > 90 ? "#7F1D1D" : c.daysSinceLastPurchase > 30 ? "#78350F" : "#059669" }}>
                          {c.daysSinceLastPurchase}
                        </td>
                        <td>
                          <span className="status-badge" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                            {statusCfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {/* ── Win-back ─────────────────────────────────────── */}
          {(a.winbackCandidates?.length ?? 0) > 0 && (
            <section>
              <h2>{isRu ? "Клиенты для реактивации" : "Qayta jalb qilish kerak bo'lgan mijozlar"}</h2>
              <table>
                <thead>
                  <tr>
                    <th>{isRu ? "Клиент" : "Mijoz"}</th>
                    <th style={{ textAlign: "right" }}>{isRu ? "Выручка" : "Daromad"}</th>
                    <th style={{ textAlign: "right" }}>{isRu ? "Заказы" : "Buyurtmalar"}</th>
                    <th style={{ textAlign: "right" }}>{isRu ? "Нет покупок" : "Xarid yo'q"}</th>
                    <th>{isRu ? "Персональная стратегия реактивации" : "Shaxsiy qayta jalb strategiyasi"}</th>
                  </tr>
                </thead>
                <tbody>
                  {a.winbackCandidates.map((c, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 10, color: "#64748B" }}>{c.phone}</div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#4F46E5" }}>{uzs(c.totalSpend)}</td>
                      <td style={{ textAlign: "right" }}>{c.orderCount}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#DC2626" }}>{c.daysSinceLastPurchase}{isRu ? "д" : "k"}</td>
                      <td style={{ fontSize: 11, color: "#334155", lineHeight: 1.6 }}>{c.strategy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* ── Insights ─────────────────────────────────────── */}
          {(a.insights?.length ?? 0) > 0 && (
            <section className="page-break">
              <h2>{isRu ? "Ключевые наблюдения" : "Asosiy kuzatuvlar"}</h2>
              <div className="grid2">
                {a.insights.map((ins, i) => {
                  const cfg = INSIGHT_CFG[ins.type as keyof typeof INSIGHT_CFG] ?? INSIGHT_CFG.opportunity;
                  return (
                    <div key={i} className="insight-box" style={{ background: cfg.bg, borderLeftColor: cfg.border }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "baseline", marginBottom: 4 }}>
                        <span style={{ color: cfg.color, fontWeight: 900, fontSize: 13 }}>{cfg.sym}</span>
                        <span style={{ fontWeight: 700, fontSize: 12, color: cfg.color }}>{ins.title}</span>
                      </div>
                      <p style={{ fontSize: 11, color: "#334155", lineHeight: 1.6 }}>{ins.description}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Recommendations ──────────────────────────────── */}
          {(a.recommendations?.length ?? 0) > 0 && (
            <section>
              <h2>{isRu ? "Стратегические рекомендации" : "Strategik tavsiyalar"}</h2>
              {a.recommendations.map((rec, i) => (
                <div key={i} className="rec-box">
                  <div className="rec-meta">
                    <span style={{ fontSize: 13, fontWeight: 900, color: PRI_COLOR[rec.priority] ?? "#475569", minWidth: 20 }}>
                      {i + 1}.
                    </span>
                    <span className="rec-title">{rec.title}</span>
                    <span className="badge" style={{ background: "#F1F5F9", color: PRI_COLOR[rec.priority] ?? "#475569", border: `1px solid ${PRI_COLOR[rec.priority] ?? "#E2E8F0"}` }}>
                      {rec.priority.toUpperCase()}
                    </span>
                    <span className="badge" style={{ background: "#EEF2FF", color: "#4338CA" }}>
                      {CAT[rec.category] ?? rec.category}
                    </span>
                  </div>
                  <p className="rec-desc">{rec.description}</p>
                  {rec.expectedImpact && (
                    <p className="rec-impact">
                      <strong style={{ color: "#334155" }}>{isRu ? "Ожидаемый эффект: " : "Kutilayotgan natija: "}</strong>
                      {rec.expectedImpact}
                    </p>
                  )}
                  {(rec.actionSteps?.length ?? 0) > 0 && (
                    <ol className="steps">
                      {rec.actionSteps.map((step, j) => <li key={j}>{step}</li>)}
                    </ol>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* ── Loyalty metrics ──────────────────────────────── */}
          {a.loyaltyMetrics && (
            <section>
              <h2>{isRu ? "Метрики лояльности клиентов" : "Mijozlar sadoqati ko'rsatkichlari"}</h2>
              <div className="grid4" style={{ marginBottom: 14 }}>
                {[
                  { label: isRu ? "Повторные покупки" : "Takroriy xaridlar", value: pct(a.loyaltyMetrics.repeatPurchaseRate), accent: "#4F46E5" },
                  { label: isRu ? "VIP клиентов" : "VIP mijozlar",           value: sp(a.loyaltyMetrics.vipClientCount),      sub: `> ${uzs(a.loyaltyMetrics.vipThreshold)}`, accent: "#D97706" },
                  { label: isRu ? "Частота покупок" : "Xarid chastotasi",    value: `${a.loyaltyMetrics.avgPurchaseFrequencyDays} ${isRu ? "дн." : "kun"}`, accent: "#059669" },
                  { label: isRu ? "Возвраты" : "Qaytarishlar",               value: pct(s.returnRate), accent: s.returnRate > 5 ? "#DC2626" : "#475569" },
                ].map(({ label, value, sub, accent }) => (
                  <div key={label} style={{ padding: "12px 14px", border: "1px solid #E2E8F0", borderRadius: 6, borderTop: `3px solid ${accent}` }}>
                    <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: accent }}>{value}</div>
                    {sub && <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{sub}</div>}
                  </div>
                ))}
              </div>
              {a.loyaltyMetrics.retentionInsight && (
                <p style={{ fontSize: 12, color: "#334155", lineHeight: 1.75, padding: "12px 16px", background: "#F8FAFC", borderRadius: 6, borderLeft: "3px solid #6366F1" }}>
                  {a.loyaltyMetrics.retentionInsight}
                </p>
              )}
            </section>
          )}

          {/* ── Footer ───────────────────────────────────────── */}
          <div style={{ marginTop: 44, paddingTop: 16, borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94A3B8" }}>
            <span>Billz Analytics — {isRu ? "Аналитика клиентской базы" : "Mijozlar bazasi tahlili"}</span>
            <span>{dateStr}</span>
          </div>

        </div>
      </body>
    </html>
  );
}
