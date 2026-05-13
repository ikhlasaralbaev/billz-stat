import { getDashboardUser, getRecentReports } from "@/lib/dashboard";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { connectDB } from "@/lib/db";
import AiAnalysis from "@/models/AiAnalysis";
import Link from "next/link";
import { FileText, Bot, ChevronRight, Store } from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";

export default async function ReportsPage() {
  const user = await getDashboardUser();
  if (!user) redirect("/auth/error");

  const lang = getLang(user);
  const isRu = lang === "ru";

  const reports = await getRecentReports(user.telegramId, 30, user.billzToken);
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#1E293B" }}>
          <FileText size={28} style={{ color: "#475569" }} />
        </div>
        <p className="text-white font-semibold">{isRu ? "Нет отчётов" : "Hisobotlar yo'q"}</p>
      </div>
    );
  }

  await connectDB();
  const reportIds = reports.map((r) => r._id);
  const analyses = await AiAnalysis.find({ reportId: { $in: reportIds } }).lean();
  const analysisMap = new Map(analyses.map((a) => [a.reportId.toString(), a]));

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-white">{isRu ? "Отчёты" : "Hisobotlar"}</h1>
        <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
          {isRu ? `${reports.length} сохранённых отчётов` : `${reports.length} ta saqlangan hisobot`}
        </p>
      </div>

      <div className="space-y-3">
        {reports.map((report) => {
          const date = new Date(report.createdAt);
          const dateStr = date.toLocaleDateString(isRu ? "ru-RU" : "uz-UZ", {
            day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
          });
          const hasAi = analysisMap.has(report._id.toString());
          const t = report.today;

          return (
            <Link
              key={report._id.toString()}
              href={`/dashboard/reports/${report._id}`}
              className="block rounded-2xl p-5 transition-colors group"
              style={{ background: "#0D1526", border: "1px solid #1E293B" }}
              onMouseEnter={undefined}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1 min-w-0">
                  {/* Header row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-white">{dateStr}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "#1E293B", color: "#64748B" }}
                    >
                      {report.source === "cron" ? (isRu ? "Авто" : "Avtomatik") : (isRu ? "Ручной" : "Qo'lda")}
                    </span>
                    {hasAi && (
                      <span
                        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "#1E1B4B", color: "#A5B4FC" }}
                      >
                        <Bot size={10} />
                        AI
                      </span>
                    )}
                  </div>

                  {/* Metrics row */}
                  <div className="flex items-center gap-6 flex-wrap">
                    {[
                      { label: isRu ? "Выручка" : "Sotuv", value: fmt(t.netGrossSales), color: "#A5B4FC" },
                      { label: isRu ? "Прибыль" : "Foyda", value: fmt(t.grossProfit), color: "#34D399" },
                      { label: isRu ? "Маржа" : "Marja", value: `${t.profitMargin.toFixed(1)}%`, color: "#FCD34D" },
                      { label: isRu ? "Чеки" : "Cheklar", value: `${t.ordersCount}`, color: "#94A3B8" },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <p className="text-xs" style={{ color: "#475569" }}>{label}</p>
                        <p className="text-sm font-semibold mt-0.5" style={{ color }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Shops */}
                  {report.shops.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Store size={11} style={{ color: "#475569" }} />
                      {report.shops.map((s) => (
                        <span key={s.shopName} className="text-xs" style={{ color: "#475569" }}>
                          {s.shopName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <ChevronRight
                  size={18}
                  className="shrink-0 mt-1 transition-transform group-hover:translate-x-1"
                  style={{ color: "#334155" }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
