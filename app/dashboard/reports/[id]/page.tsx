import { getDashboardUser } from "@/lib/dashboard";
import { redirect, notFound } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { connectDB } from "@/lib/db";
import Report from "@/models/Report";
import AiAnalysis from "@/models/AiAnalysis";
import Link from "next/link";
import { ArrowLeft, Bot, Store, Package, Warehouse } from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";
const fmtQ = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getDashboardUser();
  if (!user) redirect("/auth/error");

  const { id } = await params;
  const lang = getLang(user);
  const isRu = lang === "ru";

  await connectDB();
  const [report, aiAnalyses] = await Promise.all([
    Report.findOne({ _id: id, telegramId: user.telegramId }).lean(),
    AiAnalysis.find({ reportId: id }).sort({ createdAt: -1 }).lean(),
  ]);

  if (!report) notFound();

  const t = report.today;
  const y = report.yesterday;
  const date = new Date(report.createdAt);
  const dateStr = date.toLocaleDateString(isRu ? "ru-RU" : "uz-UZ", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  function diffBadge(a: number, b: number) {
    if (!b) return null;
    const p = ((a - b) / b) * 100;
    return { p: Math.abs(p).toFixed(1), up: p >= 0 };
  }

  return (
    <div className="space-y-8">

      {/* Back + header */}
      <div>
        <Link
          href="/dashboard/reports"
          className="inline-flex items-center gap-1.5 text-sm mb-4"
          style={{ color: "#64748B" }}
        >
          <ArrowLeft size={14} />
          {isRu ? "Назад к отчётам" : "Hisobotlarga qaytish"}
        </Link>
        <h1 className="text-2xl font-bold text-white">{dateStr}</h1>
        <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
          {report.source === "cron" ? (isRu ? "Автоматический отчёт" : "Avtomatik hisobot") : (isRu ? "Ручной отчёт" : "Qo'lda yaratilgan")}
        </p>
      </div>

      {/* Today vs Yesterday */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {[
          { label: isRu ? "Сегодня" : "Bugun", stats: t, accent: "#6366F1" },
          { label: isRu ? "Вчера" : "Kecha", stats: y, accent: "#475569" },
        ].map(({ label, stats, accent }) => (
          <div key={label} className="rounded-2xl p-5 space-y-4" style={{ background: "#0D1526", border: "1px solid #1E293B" }}>
            <h3 className="text-sm font-semibold" style={{ color: accent }}>{label}</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: isRu ? "Выручка" : "Sotuv", v: fmt(stats.netGrossSales), c: "#A5B4FC" },
                { k: isRu ? "Прибыль" : "Foyda", v: `${fmt(stats.grossProfit)} (${stats.profitMargin.toFixed(1)}%)`, c: "#34D399" },
                { k: isRu ? "Скидки" : "Chegirma", v: fmt(stats.discountSum), c: "#F43F5E" },
                { k: isRu ? "Себестоимость" : "Tannarx", v: fmt(stats.supplyCost), c: "#94A3B8" },
                { k: isRu ? "Чеки" : "Cheklar", v: `${stats.ordersCount}`, c: "#FCD34D" },
                { k: isRu ? "Ср. чек" : "O'rt. chek", v: fmt(stats.averageCheque), c: "#94A3B8" },
                { k: isRu ? "Возвраты" : "Qaytarish", v: `${stats.returnsCount}`, c: "#FB923C" },
                { k: isRu ? "Товаров" : "Mahsulot", v: `${stats.productsSold}`, c: "#94A3B8" },
              ].map(({ k, v, c }) => (
                <div key={k}>
                  <p className="text-xs" style={{ color: "#475569" }}>{k}</p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: c }}>{v}</p>
                </div>
              ))}
            </div>
            {stats === t && y.netGrossSales > 0 && (() => {
              const d = diffBadge(t.netGrossSales, y.netGrossSales);
              if (!d) return null;
              return (
                <div
                  className="text-xs px-3 py-2 rounded-lg"
                  style={{ background: d.up ? "#022C22" : "#2D1219", color: d.up ? "#34D399" : "#F87171" }}
                >
                  {d.up ? "▲" : "▼"} {d.p}% {isRu ? "vs вчера" : "vs kecha"}
                </div>
              );
            })()}
          </div>
        ))}
      </div>

      {/* Per-shop */}
      {report.shops.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Store size={15} style={{ color: "#6366F1" }} />
            {isRu ? "По магазинам" : "Do'konlar bo'yicha"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {report.shops.map((shop) => (
              <div key={shop.shopName} className="rounded-xl p-4 space-y-2" style={{ background: "#0D1526", border: "1px solid #1E293B" }}>
                <p className="text-sm font-semibold text-white">{shop.shopName}</p>
                {[
                  { k: isRu ? "Выручка" : "Sotuv", v: fmt(shop.today.netGrossSales), c: "#A5B4FC" },
                  { k: isRu ? "Прибыль" : "Foyda", v: `${fmt(shop.today.grossProfit)} (${shop.today.profitMargin.toFixed(1)}%)`, c: "#34D399" },
                  { k: isRu ? "Чеки" : "Cheklar", v: `${shop.today.ordersCount}`, c: "#94A3B8" },
                ].map(({ k, v, c }) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span style={{ color: "#475569" }}>{k}</span>
                    <span className="font-medium" style={{ color: c }}>{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dead stock + Overstock compact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="rounded-2xl p-5 space-y-3" style={{ background: "#0D1526", border: "1px solid #1E293B" }}>
          <div className="flex items-center gap-2">
            <Package size={14} style={{ color: "#F87171" }} />
            <h3 className="text-sm font-semibold text-white">Dead Stock</h3>
            <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ background: "#2D1219", color: "#F87171" }}>
              {report.deadStock.length} {isRu ? "вид(а)" : "xil"}
            </span>
          </div>
          {report.deadStock.length === 0 ? (
            <p className="text-xs" style={{ color: "#334155" }}>{isRu ? "Нет" : "Yo'q"}</p>
          ) : report.deadStock.slice(0, 5).map((item) => (
            <div key={item.sku || item.name} className="flex justify-between text-xs py-1" style={{ borderBottom: "1px solid #0F172A" }}>
              <span className="text-white truncate mr-2">{item.name}</span>
              <span style={{ color: "#F87171" }}>{fmtQ(item.totalStock)} {isRu ? "шт." : "dona"}</span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-5 space-y-3" style={{ background: "#0D1526", border: "1px solid #1E293B" }}>
          <div className="flex items-center gap-2">
            <Warehouse size={14} style={{ color: "#FB923C" }} />
            <h3 className="text-sm font-semibold text-white">{isRu ? "Оверсток" : "Overstock"}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ background: "#1C1207", color: "#FB923C" }}>
              {report.overstock.length} {isRu ? "вид(а)" : "xil"}
            </span>
          </div>
          {report.overstock.length === 0 ? (
            <p className="text-xs" style={{ color: "#334155" }}>{isRu ? "Нет" : "Yo'q"}</p>
          ) : report.overstock.slice(0, 5).map((item) => {
            const days = item.daysOfStock === Infinity ? "∞" : `${item.daysOfStock}`;
            return (
              <div key={item.sku || item.name} className="flex justify-between text-xs py-1" style={{ borderBottom: "1px solid #0F172A" }}>
                <span className="text-white truncate mr-2">{item.name}</span>
                <span style={{ color: "#FB923C" }}>{days} {isRu ? "дн." : "kun"}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Analyses */}
      {aiAnalyses.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Bot size={15} style={{ color: "#A5B4FC" }} />
            AI {isRu ? "Анализы" : "Tahlillar"} ({aiAnalyses.length})
          </h2>
          <div className="space-y-4">
            {aiAnalyses.map((ai, i) => (
              <div
                key={ai._id.toString()}
                className="rounded-2xl p-5 space-y-3"
                style={{ background: "#0D1526", border: "1px solid #1E293B" }}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#1E1B4B" }}>
                      <Bot size={12} style={{ color: "#A5B4FC" }} />
                    </div>
                    <span className="text-xs text-white font-medium">
                      {isRu ? `Анализ #${aiAnalyses.length - i}` : `Tahlil #${aiAnalyses.length - i}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: "#475569" }}>
                    <span>{ai.aiModel}</span>
                    <span>{ai.totalTokens} tokens</span>
                    <span>{(ai.durationMs / 1000).toFixed(1)}s</span>
                  </div>
                </div>
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap rounded-xl p-4"
                  style={{ color: "#CBD5E1", background: "#070B14", fontFamily: "inherit" }}
                >
                  {ai.responseText}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
