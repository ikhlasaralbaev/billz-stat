import { getDashboardUser, getRecentReports } from "@/lib/dashboard";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { ShoppingCart, TrendingUp, TrendingDown, Minus } from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";
const fmtC = (n: number) =>
  new Intl.NumberFormat("uz-UZ", { notation: "compact", maximumFractionDigits: 1 }).format(Math.round(n));

export default async function SalesPage() {
  const user = await getDashboardUser();
  if (!user) redirect("/auth/error");

  const lang = getLang(user);
  const isRu = lang === "ru";
  const reports = await getRecentReports(user.telegramId, 30, user.billzToken);
  const shopFilter = user.selectedShopNames?.length ? new Set(user.selectedShopNames) : null;

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#1E293B" }}>
          <ShoppingCart size={28} style={{ color: "#475569" }} />
        </div>
        <p className="text-white font-semibold">{isRu ? "Нет данных" : "Ma'lumot yo'q"}</p>
      </div>
    );
  }

  const getReportRevenue = (r: (typeof reports)[0]) => {
    if (!shopFilter || !r.shops?.length) return r.today.netGrossSales;
    const filtered = r.shops.filter((s) => shopFilter.has(s.shopName));
    return filtered.length
      ? filtered.reduce((sum, s) => sum + s.today.netGrossSales, 0)
      : r.today.netGrossSales;
  };

  const getReportProfit = (r: (typeof reports)[0]) => {
    if (!shopFilter || !r.shops?.length) return r.today.grossProfit;
    const filtered = r.shops.filter((s) => shopFilter.has(s.shopName));
    return filtered.length
      ? filtered.reduce((sum, s) => sum + s.today.grossProfit, 0)
      : r.today.grossProfit;
  };

  const getReportOrders = (r: (typeof reports)[0]) => {
    if (!shopFilter || !r.shops?.length) return r.today.ordersCount;
    const filtered = r.shops.filter((s) => shopFilter.has(s.shopName));
    return filtered.length
      ? filtered.reduce((sum, s) => sum + s.today.ordersCount, 0)
      : r.today.ordersCount;
  };

  const sorted = [...reports].reverse();
  const maxRevenue = Math.max(...sorted.map((r) => getReportRevenue(r)), 1);
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];

  const avgRevenue = sorted.reduce((s, r) => s + getReportRevenue(r), 0) / sorted.length;
  const avgProfit = sorted.reduce((s, r) => s + getReportProfit(r), 0) / sorted.length;
  const avgOrders = sorted.reduce((s, r) => s + getReportOrders(r), 0) / sorted.length;
  const totalRevenue = sorted.reduce((s, r) => s + getReportRevenue(r), 0);

  function diff(a: number, b: number) {
    if (!b) return null;
    const p = ((a - b) / b) * 100;
    return { p: Math.abs(p).toFixed(1), up: p >= 0 };
  }

  const latestVsPrev = prev ? diff(getReportRevenue(latest), getReportRevenue(prev)) : null;

  return (
    <div className="space-y-8">

      <div>
        <h1 className="text-2xl font-bold text-white">{isRu ? "Продажи" : "Sotuvlar"}</h1>
        <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
          {isRu ? `Динамика за ${sorted.length} дней` : `${sorted.length} kunlik dinamika`}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: isRu ? "Ср. выручка/день" : "O'rt. kunlik sotuv", value: fmt(avgRevenue), color: "#A5B4FC" },
          { label: isRu ? "Ср. прибыль/день" : "O'rt. kunlik foyda", value: fmt(avgProfit), color: "#34D399" },
          { label: isRu ? "Ср. чеков/день" : "O'rt. kunlik chek", value: `${Math.round(avgOrders)}`, color: "#FCD34D" },
          { label: isRu ? "Общая выручка" : "Jami sotuv", value: fmtC(totalRevenue) + " UZS", color: "#F472B6" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl p-5" style={{ background: "#0D1526", border: "1px solid #1E293B" }}>
            <p className="text-xs mb-2" style={{ color: "#64748B" }}>{c.label}</p>
            <p className="text-xl font-bold" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Latest vs previous */}
      {latestVsPrev && (
        <div className="rounded-2xl p-5 flex items-center gap-6" style={{ background: "#0D1526", border: "1px solid #1E293B" }}>
          {latestVsPrev.up
            ? <TrendingUp size={28} style={{ color: "#34D399" }} />
            : <TrendingDown size={28} style={{ color: "#F87171" }} />}
          <div>
            <p className="text-sm font-semibold" style={{ color: latestVsPrev.up ? "#34D399" : "#F87171" }}>
              {latestVsPrev.up ? "+" : "-"}{latestVsPrev.p}% {isRu ? "vs предыдущий день" : "vs oldingi kun"}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
              {fmt(getReportRevenue(latest))} {isRu ? "сегодня" : "bugun"} · {fmt(getReportRevenue(prev))} {isRu ? "вчера" : "kecha"}
            </p>
          </div>
        </div>
      )}

      {/* Revenue bar chart */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: "#0D1526", border: "1px solid #1E293B" }}>
        <div className="flex items-center gap-2 mb-2">
          <ShoppingCart size={15} style={{ color: "#6366F1" }} />
          <h2 className="text-sm font-semibold text-white">
            {isRu ? "Динамика выручки" : "Sotuv dinamikasi"}
          </h2>
        </div>

        <div className="space-y-2">
          {sorted.map((report, i) => {
            const val = getReportRevenue(report);
            const profit = getReportProfit(report);
            const pctRevenue = (val / maxRevenue) * 100;
            const pctProfit = val > 0 ? (profit / val) * 100 : 0;
            const date = new Date(report.today.date ?? report.createdAt);
            const label = date.toLocaleDateString(isRu ? "ru-RU" : "uz-UZ", { day: "numeric", month: "short" });
            const isLatest = i === sorted.length - 1;
            const prevReport = sorted[i - 1];
            const dayDiff = prevReport ? diff(val, getReportRevenue(prevReport)) : null;

            return (
              <div key={report._id?.toString() ?? i} className="grid grid-cols-[72px_1fr_100px] items-center gap-3">
                <span className="text-xs text-right" style={{ color: isLatest ? "#A5B4FC" : "#64748B" }}>{label}</span>
                <div className="space-y-1">
                  <div className="h-2 rounded-full" style={{ background: "#0F172A" }}>
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${pctRevenue}%`,
                        background: isLatest ? "linear-gradient(90deg, #6366F1, #8B5CF6)" : "#1E3A5F",
                      }}
                    />
                  </div>
                  <div className="h-1 rounded-full" style={{ background: "#0F172A" }}>
                    <div
                      className="h-1 rounded-full"
                      style={{ width: `${pctProfit}%`, background: "#10B98150" }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-xs font-medium" style={{ color: isLatest ? "#A5B4FC" : "#475569" }}>
                    {fmtC(val)}
                  </span>
                  {dayDiff && (
                    <span className="text-xs" style={{ color: dayDiff.up ? "#34D399" : "#F87171" }}>
                      {dayDiff.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 pt-2 text-xs" style={{ color: "#475569", borderTop: "1px solid #0F172A" }}>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm" style={{ background: "#1E3A5F" }} />
            {isRu ? "Выручка" : "Sotuv"}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1 rounded-sm" style={{ background: "#10B98150" }} />
            {isRu ? "Прибыль (доля)" : "Foyda (ulushi)"}
          </div>
        </div>
      </div>

      {/* Daily breakdown table */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-4">
          {isRu ? "По дням" : "Kunlar bo'yicha"}
        </h2>
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1E293B" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#0A0F1E", borderBottom: "1px solid #1E293B" }}>
                {[
                  isRu ? "Дата" : "Sana",
                  isRu ? "Выручка" : "Sotuv",
                  isRu ? "Прибыль" : "Foyda",
                  isRu ? "Маржа" : "Marja",
                  isRu ? "Чеки" : "Cheklar",
                  isRu ? "Ср. чек" : "O'rt. chek",
                  isRu ? "Динамика" : "Dinamika",
                ].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: "#475569" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...sorted].reverse().map((report, i, arr) => {
                const prevR = arr[i + 1];
                const rev = getReportRevenue(report);
                const prof = getReportProfit(report);
                const ords = getReportOrders(report);
                const d = prevR ? diff(rev, getReportRevenue(prevR)) : null;
                const date = new Date(report.today.date ?? report.createdAt);
                const DiffIcon = d ? (d.up ? TrendingUp : TrendingDown) : Minus;
                const margin = rev > 0 ? (prof / rev) * 100 : 0;
                const avgCheque = ords > 0 ? rev / ords : 0;
                return (
                  <tr key={report._id?.toString() ?? i} style={{ background: i % 2 === 0 ? "#0D1526" : "#0A0F1E", borderBottom: "1px solid #0F172A" }}>
                    <td className="px-4 py-3 text-white font-medium">
                      {date.toLocaleDateString(isRu ? "ru-RU" : "uz-UZ", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: "#A5B4FC" }}>{fmt(rev)}</td>
                    <td className="px-4 py-3" style={{ color: "#34D399" }}>{fmt(prof)}</td>
                    <td className="px-4 py-3" style={{ color: "#64748B" }}>{margin.toFixed(1)}%</td>
                    <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{ords}</td>
                    <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{fmt(avgCheque)}</td>
                    <td className="px-4 py-3">
                      {d ? (
                        <div className="flex items-center gap-1" style={{ color: d.up ? "#34D399" : "#F87171" }}>
                          <DiffIcon size={12} />
                          <span className="text-xs">{d.up ? "+" : "-"}{d.p}%</span>
                        </div>
                      ) : <span style={{ color: "#334155" }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
