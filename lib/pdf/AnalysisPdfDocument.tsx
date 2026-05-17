import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ClientsAnalysisResult } from "@/app/dashboard/clients/clientsAnalysisAction";

const c = {
  indigo: "#4F46E5",
  indigoLight: "#EEF2FF",
  green: "#059669",
  greenLight: "#D1FAE5",
  greenDark: "#065F46",
  amber: "#D97706",
  amberLight: "#FEF3C7",
  amberDark: "#78350F",
  red: "#DC2626",
  redLight: "#FEE2E2",
  redDark: "#7F1D1D",
  blue: "#2563EB",
  blueLight: "#DBEAFE",
  blueDark: "#1E40AF",
  slate: "#64748B",
  slateLight: "#F1F5F9",
  slate100: "#F8FAFC",
  slate200: "#E2E8F0",
  slate300: "#CBD5E1",
  slate400: "#94A3B8",
  slate600: "#475569",
  slate700: "#334155",
  slate800: "#1E293B",
  slate900: "#0F172A",
};

const FONT = "DejaVu";
const FONT_BOLD = "DejaVu";

const s = StyleSheet.create({
  page: {
    fontFamily: FONT,
    fontWeight: 400,
    fontSize: 9,
    color: c.slate800,
    backgroundColor: "white",
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 44,
  },
  // Header
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: c.indigo },
  headerLeft: { flex: 1 },
  brand: { fontSize: 7, fontFamily: FONT_BOLD, fontWeight: 700, letterSpacing: 1, color: c.indigo, marginBottom: 5, textTransform: "uppercase" },
  title: { fontSize: 20, fontFamily: FONT_BOLD, fontWeight: 700, color: c.slate900, marginBottom: 5, lineHeight: 1.2 },
  subtitle: { fontSize: 8, color: c.slate },
  scoreBadge: { padding: "10 16", borderRadius: 8, alignItems: "center", marginLeft: 20 },
  scoreNum: { fontSize: 28, fontFamily: FONT_BOLD, fontWeight: 700, lineHeight: 1 },
  scoreSub: { fontSize: 7, fontFamily: FONT_BOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 1 },
  scoreLabel: { fontSize: 9, fontFamily: FONT_BOLD, fontWeight: 700, marginTop: 3 },
  // Section
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 7, fontFamily: FONT_BOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: c.indigo, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1.5, borderBottomColor: "#E0E7FF" },
  // Grid
  row: { flexDirection: "row", gap: 8 },
  // Cards
  card: { flex: 1, padding: "10 12", borderRadius: 5, borderWidth: 1, borderColor: c.slate200, borderLeftWidth: 3 },
  cardLabel: { fontSize: 7, fontFamily: FONT_BOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: c.slate, marginBottom: 3 },
  cardValue: { fontSize: 16, fontFamily: FONT_BOLD, fontWeight: 700 },
  cardSub: { fontSize: 7, color: c.slate400, marginTop: 2 },
  miniCard: { flex: 1, padding: "8 10", borderRadius: 4, borderWidth: 1, borderColor: c.slate200 },
  miniLabel: { fontSize: 7, fontFamily: FONT_BOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, color: c.slate, marginBottom: 3 },
  miniValue: { fontSize: 12, fontFamily: FONT_BOLD, fontWeight: 700, color: c.slate900 },
  // Table
  table: { width: "100%" },
  th: { fontSize: 7, fontFamily: FONT_BOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, color: c.slate, paddingVertical: 5, paddingHorizontal: 6, backgroundColor: c.slate100, borderBottomWidth: 1.5, borderBottomColor: c.slate200 },
  td: { fontSize: 8, paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: c.slateLight },
  tdEven: { backgroundColor: "#FAFBFC" },
  thRow: { flexDirection: "row" },
  tdRow: { flexDirection: "row" },
  // Insight
  insightBox: { padding: "7 10", borderRadius: 4, borderLeftWidth: 3, marginBottom: 6 },
  insightTitle: { fontSize: 8, fontFamily: FONT_BOLD, fontWeight: 700, marginBottom: 3 },
  insightDesc: { fontSize: 7.5, lineHeight: 1.5 },
  // Rec
  recBox: { borderWidth: 1, borderColor: c.slate200, borderRadius: 5, padding: "10 12", marginBottom: 8 },
  recMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" },
  recTitle: { fontSize: 9, fontFamily: FONT_BOLD, fontWeight: 700, flex: 1 },
  recDesc: { fontSize: 8, color: c.slate700, lineHeight: 1.6, marginBottom: 4 },
  recImpact: { fontSize: 7.5, color: c.slate, marginBottom: 4 },
  stepItem: { fontSize: 7.5, color: c.slate600, lineHeight: 1.5, marginBottom: 2, paddingLeft: 10 },
  badge: { fontSize: 7, fontFamily: FONT_BOLD, fontWeight: 700, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 3 },
  // Quote box
  quoteBox: { padding: "8 12", backgroundColor: c.slate100, borderLeftWidth: 2.5, borderLeftColor: c.indigo, borderRadius: 3, marginBottom: 10 },
  quoteText: { fontSize: 8.5, color: c.slate700, lineHeight: 1.7 },
  // Footer
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 30, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: c.slate200 },
  footerText: { fontSize: 7, color: c.slate400 },
  // Alert
  alertBox: { padding: "6 10", borderRadius: 4, borderLeftWidth: 3, marginBottom: 6, flexDirection: "row", alignItems: "center", gap: 6 },
  alertText: { fontSize: 8, flex: 1 },
});

// Helpers
const sp = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
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
  growing:   { bg: c.greenLight,  color: c.greenDark,  labelRu: "Rост ↑",       labelUz: "O'smoqda ↑" },
  stable:    { bg: c.amberLight,  color: c.amberDark,  labelRu: "Стабильно →",  labelUz: "Barqaror →" },
  declining: { bg: c.redLight,    color: c.redDark,    labelRu: "Снижение ↓",   labelUz: "Tushmoqda ↓" },
};

const INSIGHT_CFG = {
  success:     { bg: c.greenLight, border: c.green,   color: c.greenDark, sym: "✓" },
  warning:     { bg: c.amberLight, border: c.amber,   color: c.amberDark, sym: "!" },
  opportunity: { bg: c.blueLight,  border: c.blue,    color: c.blueDark,  sym: "→" },
  risk:        { bg: c.redLight,   border: c.red,     color: c.redDark,   sym: "✕" },
};

const PRI_COLOR: Record<string, string> = {
  critical: c.redDark,
  high: c.amberDark,
  medium: "#713F12",
  low: c.slate600,
};

const SEG_COLOR: Record<string, string> = {
  indigo: c.indigo, emerald: c.green, amber: c.amber, rose: c.red, slate: c.slate,
};

const CAT_RU: Record<string, string> = {
  retention: "Удержание", acquisition: "Привлечение",
  reactivation: "Реактивация", loyalty: "Лояльность", revenue: "Выручка",
};
const CAT_UZ: Record<string, string> = {
  retention: "Saqlash", acquisition: "Jalb etish",
  reactivation: "Qaytarish", loyalty: "Sadoqat", revenue: "Daromad",
};

interface Props {
  analysis: ClientsAnalysisResult;
  analyzedAt: string | null;
  isRu: boolean;
}

export function AnalysisPdfDocument({ analysis: a, analyzedAt, isRu }: Props) {
  const s2 = a.summary;
  const health = (s2.overallHealth ?? "stable") as keyof typeof HEALTH_CFG;
  const hcfg = HEALTH_CFG[health] ?? HEALTH_CFG.stable;
  const dateStr = analyzedAt ? fmtDate(analyzedAt, isRu) : "—";
  const CAT = isRu ? CAT_RU : CAT_UZ;

  const topTotal = sp(s2.totalClients);

  return (
    <Document title={isRu ? "Анализ клиентской базы" : "Mijozlar bazasi tahlili"}>

      {/* ── PAGE 1: Overview ─────────────────────────── */}
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.headerRow} fixed>
          <View style={s.headerLeft}>
            <Text style={s.brand}>Billz Analytics</Text>
            <Text style={s.title}>
              {isRu ? "Анализ клиентской базы" : "Mijozlar bazasi tahlili"}
            </Text>
            <Text style={s.subtitle}>
              {isRu ? "Сформировано: " : "Yaratilgan: "}{dateStr}
              {"  ·  "}{topTotal} {isRu ? "клиентов в базе" : "ta mijoz bazada"}
            </Text>
          </View>
          <View style={[s.scoreBadge, { backgroundColor: hcfg.bg }]}>
            <Text style={[s.scoreNum, { color: hcfg.color }]}>{s2.healthScore}</Text>
            <Text style={[s.scoreSub, { color: hcfg.color }]}>/ 100</Text>
            <Text style={[s.scoreLabel, { color: hcfg.color }]}>
              {isRu ? hcfg.labelRu : hcfg.labelUz}
            </Text>
          </View>
        </View>

        {/* Alerts */}
        {(a.alerts?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isRu ? "Предупреждения" : "Ogohlantirishlar"}</Text>
            {a.alerts.map((alert, i) => {
              const alertColor = alert.severity === "critical" ? c.red : alert.severity === "high" ? c.amber : c.blue;
              const alertBg = alert.severity === "critical" ? c.redLight : alert.severity === "high" ? c.amberLight : c.blueLight;
              return (
                <View key={i} style={[s.alertBox, { backgroundColor: alertBg, borderLeftColor: alertColor }]}>
                  <Text style={[s.alertText, { color: alert.severity === "critical" ? c.redDark : alert.severity === "high" ? c.amberDark : c.blueDark }]}>
                    {alert.message}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Key Metrics — row 1 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{isRu ? "Ключевые показатели" : "Asosiy ko'rsatkichlar"}</Text>
          <View style={[s.row, { marginBottom: 8 }]}>
            {[
              { label: isRu ? "Всего клиентов" : "Jami mijozlar",       value: sp(s2.totalClients),      sub: `+${sp(s2.newClients30d)} ${isRu ? "за 30 дн." : "30 kunda"}`,                    accent: c.indigo },
              { label: isRu ? "Активных (30д)" : "Faol (30 kun)",       value: sp(s2.activeClients30d),  sub: `${Math.round(s2.activeClients30d / Math.max(s2.totalClients,1)*100)}% ${isRu ? "от базы" : "bazadan"}`, accent: c.green },
              { label: isRu ? "Новых (30д)" : "Yangi (30 kun)",         value: sp(s2.newClients30d),     sub: `${sp(s2.newClients90d)} ${isRu ? "за 90 дн." : "90 kunda"}`,                    accent: c.blue },
            ].map(({ label, value, sub, accent }) => (
              <View key={label} style={[s.card, { borderLeftColor: accent }]}>
                <Text style={s.cardLabel}>{label}</Text>
                <Text style={[s.cardValue, { color: accent }]}>{value}</Text>
                <Text style={s.cardSub}>{sub}</Text>
              </View>
            ))}
          </View>
          <View style={[s.row, { marginBottom: 8 }]}>
            {[
              { label: isRu ? "Под угрозой" : "Xavf ostida",            value: sp(s2.atRiskClients),    sub: `${Math.round(s2.atRiskClients / Math.max(s2.totalClients,1)*100)}%`,    accent: c.amber },
              { label: isRu ? "Потеряны (90д+)" : "Yo'qolgan (90k+)",   value: sp(s2.lostClients),      sub: `${Math.round(s2.lostClients / Math.max(s2.totalClients,1)*100)}%`,      accent: c.red },
              { label: isRu ? "Средний чек" : "O'rtacha chek",          value: uzs(s2.avgOrderValue),   sub: `${s2.avgOrdersPerClient.toFixed(1)} ${isRu ? "зак./кл." : "buyurtma/mij."}`, accent: "#7C3AED" },
            ].map(({ label, value, sub, accent }) => (
              <View key={label} style={[s.card, { borderLeftColor: accent }]}>
                <Text style={s.cardLabel}>{label}</Text>
                <Text style={[s.cardValue, { color: accent }]}>{value}</Text>
                <Text style={s.cardSub}>{sub}</Text>
              </View>
            ))}
          </View>
          <View style={s.row}>
            {[
              { label: isRu ? "Общая выручка" : "Umumiy daromad",       value: uzs(s2.totalRevenue) },
              { label: isRu ? "Повторные покупки" : "Takroriy xaridlar", value: pct(s2.repeatPurchaseRate) },
              { label: isRu ? "Возвраты" : "Qaytarishlar",               value: pct(s2.returnRate) },
            ].map(({ label, value }) => (
              <View key={label} style={s.miniCard}>
                <Text style={s.miniLabel}>{label}</Text>
                <Text style={s.miniValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Trends */}
        {a.trends?.summary && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isRu ? "Динамика и тренды" : "Dinamika va trendlar"}</Text>
            <View style={[s.quoteBox, { marginBottom: 8 }]}>
              <Text style={s.quoteText}>{a.trends.summary}</Text>
            </View>
            {(a.trends.monthlyRevenue?.length ?? 0) > 0 && (
              <View style={s.table}>
                <View style={s.thRow}>
                  <View style={[{ width: 90 }]}><Text style={s.th}>{isRu ? "Показатель" : "Ko'rsatkich"}</Text></View>
                  {a.trends.monthlyRevenue.slice(-6).map(m => (
                    <View key={m.month} style={{ flex: 1 }}>
                      <Text style={[s.th, { textAlign: "right" }]}>
                        {(isRu ? MONTHS_RU : MONTHS_UZ)[parseInt(m.month.slice(5)) - 1]} {m.month.slice(2,4)}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={s.tdRow}>
                  <View style={{ width: 90 }}><Text style={[s.td, { fontFamily: "DejaVu", fontWeight: 700, fontSize: 7.5 }]}>{isRu ? "Выручка (K)" : "Daromad (K)"}</Text></View>
                  {a.trends.monthlyRevenue.slice(-6).map(m => (
                    <View key={m.month} style={{ flex: 1 }}>
                      <Text style={[s.td, { textAlign: "right" }]}>{sp(Math.round(m.amount / 1000))}</Text>
                    </View>
                  ))}
                </View>
                {(a.trends.monthlyNewClients?.length ?? 0) > 0 && (
                  <View style={[s.tdRow, { backgroundColor: "#FAFBFC" }]}>
                    <View style={{ width: 90 }}><Text style={[s.td, { fontFamily: "DejaVu", fontWeight: 700, fontSize: 7.5 }]}>{isRu ? "Новых клиентов" : "Yangi mijozlar"}</Text></View>
                    {a.trends.monthlyNewClients.slice(-6).map(m => (
                      <View key={m.month} style={{ flex: 1 }}>
                        <Text style={[s.td, { textAlign: "right" }]}>{m.count}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
            <View style={[s.row, { marginTop: 6, gap: 16 }]}>
              {a.trends.peakMonth && (
                <Text style={{ fontSize: 7.5, color: c.slate }}>
                  {isRu ? "Пик выручки: " : "Eng yuqori daromad: "}
                  <Text style={{ fontFamily: "DejaVu", fontWeight: 700, color: c.green }}>{a.trends.peakMonth}</Text>
                </Text>
              )}
              {a.trends.recentGrowthRate !== 0 && (
                <Text style={{ fontSize: 7.5, color: c.slate }}>
                  {isRu ? "Рост новых (30д): " : "Yangi mijozlar o'sishi (30k): "}
                  <Text style={{ fontFamily: "DejaVu", fontWeight: 700, color: a.trends.recentGrowthRate > 0 ? c.green : c.red }}>
                    {a.trends.recentGrowthRate > 0 ? "+" : ""}{a.trends.recentGrowthRate.toFixed(1)}%
                  </Text>
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Segments */}
        {(a.segments?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isRu ? "Сегменты клиентов" : "Mijozlar segmentlari"}</Text>
            <View style={s.table}>
              <View style={s.thRow}>
                <View style={{ flex: 2 }}><Text style={s.th}>{isRu ? "Сегмент" : "Segment"}</Text></View>
                <View style={{ flex: 1 }}><Text style={[s.th, { textAlign: "right" }]}>{isRu ? "Кол-во" : "Soni"}</Text></View>
                <View style={{ width: 36 }}><Text style={[s.th, { textAlign: "right" }]}>%</Text></View>
                <View style={{ flex: 2 }}><Text style={[s.th, { textAlign: "right" }]}>{isRu ? "Ср. чек" : "O'rt. chek"}</Text></View>
                <View style={{ flex: 4 }}><Text style={s.th}>{isRu ? "Описание" : "Tavsif"}</Text></View>
              </View>
              {a.segments.map((seg, i) => (
                <View key={i} style={[s.tdRow, i % 2 === 1 ? { backgroundColor: "#FAFBFC" } : {}]}>
                  <View style={{ flex: 2 }}>
                    <Text style={[s.td, { fontFamily: "DejaVu", fontWeight: 700, color: SEG_COLOR[seg.color] ?? c.indigo }]}>{seg.name}</Text>
                  </View>
                  <View style={{ flex: 1 }}><Text style={[s.td, { textAlign: "right" }]}>{sp(seg.count)}</Text></View>
                  <View style={{ width: 36 }}><Text style={[s.td, { textAlign: "right" }]}>{seg.percentage}%</Text></View>
                  <View style={{ flex: 2 }}><Text style={[s.td, { textAlign: "right", color: c.indigo, fontFamily: "DejaVu", fontWeight: 700 }]}>{uzs(seg.avgSpend)}</Text></View>
                  <View style={{ flex: 4 }}><Text style={[s.td, { color: c.slate600, lineHeight: 1.5 }]}>{seg.description}</Text></View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer page 1 */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Billz Analytics — {isRu ? "Анализ клиентской базы" : "Mijozlar bazasi tahlili"}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* ── PAGE 2: Top clients + Winback ────────────── */}
      <Page size="A4" style={s.page}>

        {/* Top clients */}
        {(a.topClients?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isRu ? "Топ клиентов по выручке" : "Daromad bo'yicha top mijozlar"}</Text>
            <View style={s.table}>
              <View style={s.thRow}>
                <View style={{ width: 18 }}><Text style={s.th}>#</Text></View>
                <View style={{ flex: 3 }}><Text style={s.th}>{isRu ? "Клиент" : "Mijoz"}</Text></View>
                <View style={{ flex: 2 }}><Text style={s.th}>{isRu ? "Телефон" : "Telefon"}</Text></View>
                <View style={{ flex: 2 }}><Text style={[s.th, { textAlign: "right" }]}>{isRu ? "Сумма" : "Summa"}</Text></View>
                <View style={{ width: 36 }}><Text style={[s.th, { textAlign: "right" }]}>{isRu ? "Зак." : "Buy."}</Text></View>
                <View style={{ width: 46 }}><Text style={[s.th, { textAlign: "right" }]}>{isRu ? "Нет (дн.)" : "Yo'q (k)"}</Text></View>
                <View style={{ width: 50 }}><Text style={[s.th, { textAlign: "center" }]}>{isRu ? "Статус" : "Holat"}</Text></View>
              </View>
              {a.topClients.slice(0, 20).map((cl, i) => {
                const stCfg = cl.status === "active"
                  ? { bg: c.greenLight,  color: c.greenDark,  label: isRu ? "Активен" : "Faol" }
                  : cl.status === "at_risk"
                  ? { bg: c.amberLight,  color: c.amberDark,  label: isRu ? "В риске" : "Xavf" }
                  : { bg: c.redLight,    color: c.redDark,    label: isRu ? "Потерян" : "Yo'qolgan" };
                return (
                  <View key={i} style={[s.tdRow, i % 2 === 1 ? { backgroundColor: "#FAFBFC" } : {}]}>
                    <View style={{ width: 18 }}><Text style={[s.td, { color: c.slate400, fontSize: 7 }]}>{i+1}</Text></View>
                    <View style={{ flex: 3 }}><Text style={[s.td, { fontFamily: "DejaVu", fontWeight: 700 }]}>{cl.name}</Text></View>
                    <View style={{ flex: 2 }}><Text style={[s.td, { color: c.slate, fontSize: 7.5 }]}>{cl.phone}</Text></View>
                    <View style={{ flex: 2 }}><Text style={[s.td, { textAlign: "right", fontFamily: "DejaVu", fontWeight: 700, color: c.indigo }]}>{uzs(cl.totalSpend)}</Text></View>
                    <View style={{ width: 36 }}><Text style={[s.td, { textAlign: "right" }]}>{cl.orderCount}</Text></View>
                    <View style={{ width: 46 }}>
                      <Text style={[s.td, { textAlign: "right", fontFamily: "DejaVu", fontWeight: 700, color: cl.daysSinceLastPurchase > 90 ? c.red : cl.daysSinceLastPurchase > 30 ? c.amber : c.green }]}>
                        {cl.daysSinceLastPurchase}
                      </Text>
                    </View>
                    <View style={{ width: 50, alignItems: "center", justifyContent: "center", paddingVertical: 4 }}>
                      <View style={[s.badge, { backgroundColor: stCfg.bg }]}>
                        <Text style={{ color: stCfg.color, fontSize: 6.5, fontFamily: "DejaVu", fontWeight: 700 }}>{stCfg.label}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Win-back */}
        {(a.winbackCandidates?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isRu ? "Клиенты для реактивации" : "Qayta jalb qilish kerak bo'lgan mijozlar"}</Text>
            <View style={s.table}>
              <View style={s.thRow}>
                <View style={{ flex: 2 }}><Text style={s.th}>{isRu ? "Клиент" : "Mijoz"}</Text></View>
                <View style={{ flex: 2 }}><Text style={[s.th, { textAlign: "right" }]}>{isRu ? "Выручка" : "Daromad"}</Text></View>
                <View style={{ width: 36 }}><Text style={[s.th, { textAlign: "right" }]}>{isRu ? "Зак." : "Buy."}</Text></View>
                <View style={{ width: 46 }}><Text style={[s.th, { textAlign: "right" }]}>{isRu ? "Нет (д)" : "Yo'q (k)"}</Text></View>
                <View style={{ flex: 5 }}><Text style={s.th}>{isRu ? "Стратегия реактивации" : "Qayta jalb strategiyasi"}</Text></View>
              </View>
              {a.winbackCandidates.map((cl, i) => (
                <View key={i} style={[s.tdRow, i % 2 === 1 ? { backgroundColor: "#FAFBFC" } : {}]}>
                  <View style={{ flex: 2 }}>
                    <Text style={[s.td, { fontFamily: "DejaVu", fontWeight: 700 }]}>{cl.name}</Text>
                    <Text style={[{ fontSize: 7, color: c.slate, paddingHorizontal: 6, paddingBottom: 4 }]}>{cl.phone}</Text>
                  </View>
                  <View style={{ flex: 2 }}><Text style={[s.td, { textAlign: "right", fontFamily: "DejaVu", fontWeight: 700, color: c.indigo }]}>{uzs(cl.totalSpend)}</Text></View>
                  <View style={{ width: 36 }}><Text style={[s.td, { textAlign: "right" }]}>{cl.orderCount}</Text></View>
                  <View style={{ width: 46 }}><Text style={[s.td, { textAlign: "right", fontFamily: "DejaVu", fontWeight: 700, color: c.red }]}>{cl.daysSinceLastPurchase}{isRu ? "д" : "k"}</Text></View>
                  <View style={{ flex: 5 }}><Text style={[s.td, { fontSize: 7.5, color: c.slate700, lineHeight: 1.5 }]}>{cl.strategy}</Text></View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Billz Analytics</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* ── PAGE 3: Insights + Recommendations + Loyalty ── */}
      <Page size="A4" style={s.page}>

        {/* Insights */}
        {(a.insights?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isRu ? "Ключевые наблюдения" : "Asosiy kuzatuvlar"}</Text>
            <View style={s.row}>
              <View style={{ flex: 1, gap: 0 }}>
                {a.insights.filter((_, i) => i % 2 === 0).map((ins, i) => {
                  const cfg = INSIGHT_CFG[ins.type as keyof typeof INSIGHT_CFG] ?? INSIGHT_CFG.opportunity;
                  return (
                    <View key={i} style={[s.insightBox, { backgroundColor: cfg.bg, borderLeftColor: cfg.border, marginBottom: 6 }]}>
                      <View style={{ flexDirection: "row", gap: 4, alignItems: "flex-start", marginBottom: 3 }}>
                        <Text style={{ color: cfg.color, fontFamily: "DejaVu", fontWeight: 700, fontSize: 10 }}>{cfg.sym}</Text>
                        <Text style={[s.insightTitle, { color: cfg.color, flex: 1 }]}>{ins.title}</Text>
                      </View>
                      <Text style={[s.insightDesc, { color: c.slate700 }]}>{ins.description}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={{ flex: 1, gap: 0 }}>
                {a.insights.filter((_, i) => i % 2 === 1).map((ins, i) => {
                  const cfg = INSIGHT_CFG[ins.type as keyof typeof INSIGHT_CFG] ?? INSIGHT_CFG.opportunity;
                  return (
                    <View key={i} style={[s.insightBox, { backgroundColor: cfg.bg, borderLeftColor: cfg.border, marginBottom: 6 }]}>
                      <View style={{ flexDirection: "row", gap: 4, alignItems: "flex-start", marginBottom: 3 }}>
                        <Text style={{ color: cfg.color, fontFamily: "DejaVu", fontWeight: 700, fontSize: 10 }}>{cfg.sym}</Text>
                        <Text style={[s.insightTitle, { color: cfg.color, flex: 1 }]}>{ins.title}</Text>
                      </View>
                      <Text style={[s.insightDesc, { color: c.slate700 }]}>{ins.description}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Recommendations */}
        {(a.recommendations?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isRu ? "Стратегические рекомендации" : "Strategik tavsiyalar"}</Text>
            {a.recommendations.map((rec, i) => (
              <View key={i} style={s.recBox} wrap={false}>
                <View style={s.recMeta}>
                  <Text style={{ fontSize: 10, fontFamily: "DejaVu", fontWeight: 700, color: PRI_COLOR[rec.priority] ?? c.slate, minWidth: 16 }}>{i+1}.</Text>
                  <Text style={s.recTitle}>{rec.title}</Text>
                  <View style={[s.badge, { backgroundColor: c.slateLight, borderWidth: 0.5, borderColor: PRI_COLOR[rec.priority] ?? c.slate200 }]}>
                    <Text style={{ color: PRI_COLOR[rec.priority] ?? c.slate, fontSize: 6.5, fontFamily: "DejaVu", fontWeight: 700 }}>{rec.priority.toUpperCase()}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: c.indigoLight }]}>
                    <Text style={{ color: "#4338CA", fontSize: 6.5, fontFamily: "DejaVu", fontWeight: 700 }}>{CAT[rec.category] ?? rec.category}</Text>
                  </View>
                </View>
                <Text style={s.recDesc}>{rec.description}</Text>
                {rec.expectedImpact && (
                  <Text style={s.recImpact}>
                    <Text style={{ fontFamily: "DejaVu", fontWeight: 700, color: c.slate700 }}>{isRu ? "Ожидаемый эффект: " : "Kutilayotgan natija: "}</Text>
                    {rec.expectedImpact}
                  </Text>
                )}
                {(rec.actionSteps?.length ?? 0) > 0 && rec.actionSteps.map((step, j) => (
                  <Text key={j} style={s.stepItem}>{j+1}. {step}</Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Loyalty metrics */}
        {a.loyaltyMetrics && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isRu ? "Метрики лояльности" : "Sadoqat ko'rsatkichlari"}</Text>
            <View style={[s.row, { marginBottom: 10 }]}>
              {[
                { label: isRu ? "Повторные покупки" : "Takroriy xaridlar", value: pct(a.loyaltyMetrics.repeatPurchaseRate), accent: c.indigo },
                { label: isRu ? "VIP клиентов" : "VIP mijozlar",           value: sp(a.loyaltyMetrics.vipClientCount),      sub: `> ${uzs(a.loyaltyMetrics.vipThreshold)}`, accent: c.amber },
                { label: isRu ? "Частота покупок" : "Xarid chastotasi",    value: `${a.loyaltyMetrics.avgPurchaseFrequencyDays} ${isRu ? "дн." : "kun"}`, accent: c.green },
                { label: isRu ? "Возвраты" : "Qaytarishlar",               value: pct(s2.returnRate), accent: s2.returnRate > 5 ? c.red : c.slate },
              ].map(({ label, value, sub, accent }) => (
                <View key={label} style={[s.miniCard, { borderTopWidth: 2.5, borderTopColor: accent }]}>
                  <Text style={s.miniLabel}>{label}</Text>
                  <Text style={[s.miniValue, { color: accent }]}>{value}</Text>
                  {sub && <Text style={{ fontSize: 7, color: c.slate400, marginTop: 2 }}>{sub}</Text>}
                </View>
              ))}
            </View>
            {a.loyaltyMetrics.retentionInsight && (
              <View style={s.quoteBox}>
                <Text style={s.quoteText}>{a.loyaltyMetrics.retentionInsight}</Text>
              </View>
            )}
          </View>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Billz Analytics — {isRu ? "Анализ клиентской базы" : "Mijozlar bazasi tahlili"}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

    </Document>
  );
}
