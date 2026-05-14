import { getDashboardUser } from "@/lib/dashboard";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n";
import {
  getToken, getShops,
  getClientDetail, getClientPurchases, groupPurchasesByOrder,
} from "@/lib/billz";
import { UserCheck, Phone, Store, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import OrdersTable from "./OrdersTable";

const fmt = (n: number) =>
  new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";

function fmtDate(dateStr: string | null, isRu: boolean): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(isRu ? "ru-RU" : "uz-UZ", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getDashboardUser();
  if (!user) redirect("/auth/error");
  if (!user.billzToken) redirect("/auth/error");

  const lang = getLang(user);
  const isRu = lang === "ru";

  const token = await getToken(user.billzToken, String(user.telegramId));

  const [detail, shops] = await Promise.all([
    getClientDetail(token, id, String(user.telegramId)),
    getShops(token, String(user.telegramId)),
  ]);

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm" style={{ color: "#475569" }}>
          {isRu ? "Клиент не найден" : "Mijoz topilmadi"}
        </p>
        <Link href="/dashboard/clients" className="text-sm" style={{ color: "#6366F1" }}>
          ← {isRu ? "Назад" : "Ortga"}
        </Link>
      </div>
    );
  }

  const shopIds = user.selectedShopIds?.length
    ? user.selectedShopIds
    : shops.map((s) => s.id);

  // For client purchase history, always use all shops — client may have bought in any shop
  const allShopIds = shops.map((s) => s.id);

  let purchaseRows: Awaited<ReturnType<typeof getClientPurchases>> = [];
  let purchaseError: string | null = null;
  try {
    purchaseRows = await getClientPurchases(token, id, allShopIds, String(user.telegramId));
  } catch (err) {
    purchaseError = err instanceof Error ? err.message : String(err);
  }

  const orders = groupPurchasesByOrder(purchaseRows);
  const saleOrders = orders.filter((o) => o.order_type === "Продажа" || o.order_type === "SALE");
  const returnOrders = orders.filter((o) => o.order_type !== "Продажа" && o.order_type !== "SALE");

  const name = [detail.first_name, detail.last_name].filter(Boolean).join(" ") || "—";

  const stats = [
    {
      label: isRu ? "Всего покупок" : "Jami xaridlar",
      value: fmt(detail.purchase_amount ?? 0),
      color: "#A5B4FC",
    },
    {
      label: isRu ? "Ср. чек" : "O'rt. chek",
      value: fmt(detail.average_purchase_amount ?? 0),
      color: "#34D399",
    },
    {
      label: isRu ? "Визиты" : "Tashriflar",
      value: String(detail.visits_count ?? 0),
      color: "#F59E0B",
    },
    {
      label: isRu ? "Кешбек" : "Keshbek",
      value: fmt(detail.balance ?? 0),
      color: "#22D3EE",
    },
    {
      label: isRu ? "Макс. чек" : "Maks. chek",
      value: fmt(detail.top_transaction ?? 0),
      color: "#8B5CF6",
    },
    {
      label: isRu ? "Долг" : "Qarz",
      value: fmt(detail.debt_amount ?? 0),
      color: (detail.debt_amount ?? 0) > 0 ? "#F87171" : "#475569",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link
          href="/dashboard/clients"
          className="mt-0.5 p-1.5 rounded-lg shrink-0 transition-colors"
          style={{ background: "#0D1526", border: "1px solid #1E293B", color: "#64748B" }}
        >
          <ArrowLeft size={14} />
        </Link>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "#1E1B4B" }}
          >
            <UserCheck size={14} style={{ color: "#A5B4FC" }} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">{name}</h1>
            <p className="text-xs" style={{ color: "#64748B" }}>
              {isRu ? "Карточка клиента" : "Mijoz kartochkasi"}
            </p>
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
        style={{ background: "#0D1526", border: "1px solid #1E293B" }}
      >
        {detail.phone_numbers?.[0] && (
          <div className="flex items-center gap-2 text-sm">
            <Phone size={13} style={{ color: "#475569" }} />
            <span style={{ color: "#94A3B8" }}>{detail.phone_numbers[0]}</span>
          </div>
        )}
        {detail.registered_shop?.name && (
          <div className="flex items-center gap-2 text-sm">
            <Store size={13} style={{ color: "#475569" }} />
            <span style={{ color: "#94A3B8" }}>{detail.registered_shop.name}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Calendar size={13} style={{ color: "#475569" }} />
          <span style={{ color: "#64748B" }}>{isRu ? "С нами с " : "Bizda: "}</span>
          <span style={{ color: "#94A3B8" }}>{fmtDate(detail.created_at, isRu)}</span>
        </div>
        {detail.first_purchase_date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={13} style={{ color: "#475569" }} />
            <span style={{ color: "#64748B" }}>{isRu ? "Первая покупка: " : "Birinchi xarid: "}</span>
            <span style={{ color: "#94A3B8" }}>{fmtDate(detail.first_purchase_date, isRu)}</span>
          </div>
        )}
        {detail.last_purchase_date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={13} style={{ color: "#475569" }} />
            <span style={{ color: "#64748B" }}>{isRu ? "Последняя покупка: " : "Oxirgi xarid: "}</span>
            <span style={{ color: "#94A3B8" }}>{fmtDate(detail.last_purchase_date, isRu)}</span>
          </div>
        )}
        {detail.groups?.length > 0 && (
          <div className="flex items-center gap-2 text-sm sm:col-span-2">
            <span style={{ color: "#64748B" }}>{isRu ? "Группа: " : "Guruh: "}</span>
            <div className="flex flex-wrap gap-1">
              {detail.groups.map((g) => (
                <span
                  key={g.id}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "#1E1B4B", color: "#A5B4FC" }}
                >
                  {g.name}{g.discount_percent > 0 && ` · ${g.discount_percent}%`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl px-4 py-3"
            style={{ background: "#0D1526", border: "1px solid #1E293B" }}
          >
            <p className="text-xs mb-1" style={{ color: "#475569" }}>{label}</p>
            <p className="text-sm font-semibold truncate" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          {isRu ? "История покупок" : "Xaridlar tarixi"}
          <span className="text-xs font-normal" style={{ color: "#475569" }}>
            {saleOrders.length} {isRu ? "покупок" : "ta xarid"}
            {returnOrders.length > 0 && `, ${returnOrders.length} ${isRu ? "возвратов" : "ta qaytarish"}`}
          </span>
        </h2>
        <OrdersTable orders={orders} isRu={isRu} />
      </div>
    </div>
  );
}
