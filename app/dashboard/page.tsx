import { getDashboardUser, getLatestReport, getRecentReports } from "@/lib/dashboard";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { Suspense } from "react";
import {
  DollarSign, TrendingUp, Receipt, CreditCard,
  Tag, Box, RotateCcw, ShoppingBag, Store, BarChart2, AlertTriangle,
} from "lucide-react";
import StatCard from "./components/StatCard";
import DeadStockTable from "./components/DeadStockTable";
import OverstockTable from "./components/OverstockTable";
import RevenueHistory from "./components/RevenueHistory";
import GenerateReportButton from "./components/GenerateReportButton";
import AnomalySectionServer from "./components/AnomalySectionServer";

const fmt = (n: number) =>
  new Intl.NumberFormat("uz-UZ", { notation: "compact", maximumFractionDigits: 1 }).format(
    Math.round(n)
  );
const fmtFull = (n: number) =>
  new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";

function diffBadge(today: number, yesterday: number) {
  if (yesterday === 0) return null;
  const pct = ((today - yesterday) / yesterday) * 100;
  return { pct: Math.abs(pct).toFixed(1), isUp: pct >= 0 };
}

export default async function DashboardPage() {
  const user = await getDashboardUser();
  if (!user) redirect("/auth/error");

  const lang = getLang(user);
  const isRu = lang === "ru";

  const [report, recentReports] = await Promise.all([
    getLatestReport(user.telegramId, user.billzToken),
    getRecentReports(user.telegramId, 7, user.billzToken),
  ]);

  const shopFilter = user.selectedShopNames?.length ? new Set(user.selectedShopNames) : null;

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "#1E293B" }}
        >
          <BarChart2 size={28} style={{ color: "#475569" }} />
        </div>
        <h2 className="text-xl font-semibold text-white">
          {isRu ? "Отчётов пока нет" : "Hisobotlar yo'q"}
        </h2>
        <p className="text-sm text-center max-w-xs" style={{ color: "#64748B" }}>
          {isRu
            ? "Нажмите кнопку ниже или отправьте /report в боте."
            : "Quyidagi tugmani bosing yoki botda /report yuboring."}
        </p>
        <GenerateReportButton isRu={isRu} />
      </div>
    );
  }

  const filteredShops = shopFilter
    ? report.shops.filter((s) => shopFilter.has(s.shopName))
    : report.shops;

  const filteredDeadStock = shopFilter
    ? report.deadStock.filter((i) => i.shopNames?.some((n) => shopFilter.has(n)))
    : report.deadStock;

  const filteredOverstock = shopFilter
    ? report.overstock.filter((i) => i.shopNames?.some((n) => shopFilter.has(n)))
    : report.overstock;

  // Re-aggregate today/yesterday from filtered shops
  const sumStats = (shops: typeof filteredShops, key: "today" | "yesterday") => {
    const rows = shops.map((s) => s[key]);
    const netGrossSales = rows.reduce((s, r) => s + r.netGrossSales, 0);
    const grossProfit = rows.reduce((s, r) => s + r.grossProfit, 0);
    const ordersCount = rows.reduce((s, r) => s + r.ordersCount, 0);
    return {
      ...rows[0],
      netGrossSales,
      grossProfit,
      profitMargin: netGrossSales > 0 ? (grossProfit / netGrossSales) * 100 : 0,
      discountSum: rows.reduce((s, r) => s + r.discountSum, 0),
      supplyCost: rows.reduce((s, r) => s + r.supplyCost, 0),
      ordersCount,
      returnsCount: rows.reduce((s, r) => s + r.returnsCount, 0),
      productsSold: rows.reduce((s, r) => s + r.productsSold, 0),
      averageCheque: ordersCount > 0 ? netGrossSales / ordersCount : 0,
    };
  };

  const t = filteredShops.length > 0 ? sumStats(filteredShops, "today") : report.today;
  const y = filteredShops.length > 0 ? sumStats(filteredShops, "yesterday") : report.yesterday;
  const reportDate = new Date(report.createdAt ?? Date.now());
  const dateStr = reportDate.toLocaleDateString(isRu ? "ru-RU" : "uz-UZ", {
    day: "numeric", month: "short",
  });
  const hoursAgo = Math.floor((Date.now() - reportDate.getTime()) / 3600000);
  const isStale = hoursAgo >= 24;

  const secondaryMetrics = [
    {
      label: isRu ? "Скидки" : "Chegirma",
      value: fmtFull(t.discountSum),
      color: "#F43F5E",
      Icon: Tag,
    },
    {
      label: isRu ? "Себестоимость" : "Tannarx",
      value: fmtFull(t.supplyCost),
      color: "#94A3B8",
      Icon: Box,
    },
    {
      label: isRu ? "Возвраты" : "Qaytarish",
      value: `${t.returnsCount} ${isRu ? "шт." : "ta"}`,
      color: "#FB923C",
      Icon: RotateCcw,
    },
    {
      label: isRu ? "Продано товаров" : "Mahsulot soni",
      value: `${t.productsSold} ${isRu ? "шт." : "dona"}`,
      color: "#34D399",
      Icon: ShoppingBag,
    },
  ];

  return (
    <div className="space-y-8">

      {/* Stale data warning */}
      {isStale && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: "#1C1207", border: "1px solid #92400E", color: "#FCD34D" }}
        >
          <AlertTriangle size={15} className="shrink-0" />
          <span>
            {isRu
              ? `Данные устарели — последний отчёт ${hoursAgo} ч. назад. Отправьте /report в боте для обновления.`
              : `Ma'lumotlar eskirgan — so'nggi hisobot ${hoursAgo} soat oldin. Yangilash uchun botda /report yuboring.`}
          </span>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">
              {isRu ? "Дашборд" : "Dashboard"}
            </h1>
            <GenerateReportButton isRu={isRu} />
          </div>
          <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
            {isRu ? `Последний отчёт — ${dateStr}` : `So'nggi hisobot — ${dateStr}`}
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium shrink-0"
          style={{ background: "#0F2027", color: "#22D3EE", border: "1px solid #0E7490" }}
        >
          <Store size={12} />
          {report.shops.length} {isRu ? "магазин(а)" : "do'kon"}
        </div>
      </div>

      {/* Primary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={isRu ? "Выручка" : "Sotuv"}
          value={fmt(t.netGrossSales)}
          unit="UZS"
          full={fmtFull(t.netGrossSales)}
          diff={diffBadge(t.netGrossSales, y.netGrossSales)}
          Icon={DollarSign}
          accent="#6366F1"
        />
        <StatCard
          label={isRu ? "Прибыль" : "Foyda"}
          value={fmt(t.grossProfit)}
          unit="UZS"
          full={fmtFull(t.grossProfit)}
          diff={diffBadge(t.grossProfit, y.grossProfit)}
          sub={`${t.profitMargin.toFixed(1)}%`}
          Icon={TrendingUp}
          accent="#10B981"
        />
        <StatCard
          label={isRu ? "Чеки" : "Cheklar"}
          value={String(t.ordersCount)}
          unit={isRu ? "шт." : "ta"}
          diff={diffBadge(t.ordersCount, y.ordersCount)}
          Icon={Receipt}
          accent="#F59E0B"
        />
        <StatCard
          label={isRu ? "Ср. чек" : "O'rt. chek"}
          value={fmt(t.averageCheque)}
          unit="UZS"
          full={fmtFull(t.averageCheque)}
          Icon={CreditCard}
          accent="#8B5CF6"
        />
      </div>

      {/* Anomaly alerts — streamed separately so page loads without waiting */}
      <Suspense fallback={
        <div className="rounded-2xl px-4 py-3 flex items-center gap-3 animate-pulse" style={{ background: "#0D1526", border: "1px solid #1E293B" }}>
          <div className="w-4 h-4 rounded-full shrink-0" style={{ background: "#1E293B" }} />
          <div className="h-3 rounded w-48" style={{ background: "#1E293B" }} />
        </div>
      }>
        <AnomalySectionServer />
      </Suspense>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {secondaryMetrics.map(({ label, value, color, Icon }) => (
          <div
            key={label}
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: "#0D1526", border: "1px solid #1E293B" }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${color}15` }}
            >
              <Icon size={13} style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs mb-0.5" style={{ color: "#64748B" }}>{label}</p>
              <p className="text-sm font-semibold truncate" style={{ color }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Per-shop breakdown */}
      {filteredShops.length > 1 && (
        <div>
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Store size={15} style={{ color: "#6366F1" }} />
            {isRu ? "По магазинам — сегодня" : "Do'konlar bo'yicha — bugun"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShops.map((shop) => {
              const diff = diffBadge(shop.today.netGrossSales, shop.yesterday.netGrossSales);
              return (
                <div
                  key={shop.shopName}
                  className="rounded-xl p-4 space-y-3"
                  style={{ background: "#0D1526", border: "1px solid #1E293B" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Store size={13} style={{ color: "#6366F1" }} />
                      <span className="text-sm font-medium text-white truncate">{shop.shopName}</span>
                    </div>
                    {diff && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{
                          background: diff.isUp ? "#022C22" : "#2D1219",
                          color: diff.isUp ? "#34D399" : "#F87171",
                        }}
                      >
                        {diff.isUp ? "+" : "-"}{diff.pct}%
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: isRu ? "Выручка" : "Sotuv", value: fmtFull(shop.today.netGrossSales), color: "#E2E8F0" },
                      { label: isRu ? "Прибыль" : "Foyda", value: `${fmtFull(shop.today.grossProfit)} (${shop.today.profitMargin.toFixed(1)}%)`, color: "#34D399" },
                      { label: isRu ? "Чеки" : "Cheklar", value: `${shop.today.ordersCount} ${isRu ? "шт." : "ta"}`, color: "#94A3B8" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex justify-between text-xs">
                        <span style={{ color: "#64748B" }}>{label}</span>
                        <span className="font-medium" style={{ color }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Revenue history + Dead/Overstock */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <RevenueHistory reports={recentReports} isRu={isRu} />
        </div>
        <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <DeadStockTable items={filteredDeadStock} isRu={isRu} />
          <OverstockTable items={filteredOverstock} isRu={isRu} />
        </div>
      </div>

    </div>
  );
}
