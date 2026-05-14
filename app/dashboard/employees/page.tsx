import { getDashboardUser } from "@/lib/dashboard";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { getToken, getShops, SellerStatRow } from "@/lib/billz";
import { getCachedSellerStats } from "@/services/sellerCache";
import { Suspense } from "react";
import EmployeeTable from "./EmployeeTable";
import EmployeeAnomalyServer from "./EmployeeAnomalyServer";
import EmployeePageShell from "./EmployeePageShell";
import { Users } from "lucide-react";

function toDateStr(d: Date) {
  return new Date(d.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getDashboardUser();
  if (!user) redirect("/auth/error");
  if (!user.billzToken) redirect("/auth/error");

  const lang = getLang(user);
  const isRu = lang === "ru";

  const { period = "30d" } = await searchParams;

  const today = toDateStr(new Date());
  const startDate =
    period === "today"
      ? today
      : period === "7d"
      ? toDateStr(new Date(Date.now() - 7 * 86400000))
      : toDateStr(new Date(Date.now() - 30 * 86400000));

  const userId = String(user.telegramId);
  const token = await getToken(user.billzToken, userId);

  const shopIds = user.selectedShopIds?.length
    ? user.selectedShopIds
    : (await getShops(token, userId)).map((s) => s.id);

  let rows: SellerStatRow[] = [];
  let error = false;
  try {
    rows = await getCachedSellerStats(user, token, shopIds, startDate, today);
  } catch {
    error = true;
  }

  const sorted = [...rows].sort((a, b) => b.net_gross_sales - a.net_gross_sales);

  return (
    <EmployeePageShell period={period} isRu={isRu}>
      <Suspense fallback={
        <div className="rounded-2xl px-4 py-3 flex items-center gap-3 animate-pulse" style={{ background: "#0D1526", border: "1px solid #1E293B" }}>
          <div className="w-4 h-4 rounded-full shrink-0" style={{ background: "#1E293B" }} />
          <div className="h-3 rounded w-48" style={{ background: "#1E293B" }} />
        </div>
      }>
        <EmployeeAnomalyServer sellers={sorted} period={period} shopIds={shopIds} userId={userId} isRu={isRu} />
      </Suspense>

      {error ? (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "#1A0A0A", border: "1px solid #3B1111", color: "#F87171" }}
        >
          {isRu ? "Ошибка загрузки данных. Попробуйте позже." : "Ma'lumot yuklashda xatolik. Qayta urinib ko'ring."}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "#0D1526" }}
          >
            <Users size={24} style={{ color: "#334155" }} />
          </div>
          <p className="text-sm" style={{ color: "#475569" }}>
            {isRu ? "Нет данных за выбранный период" : "Tanlangan davr uchun ma'lumot yo'q"}
          </p>
        </div>
      ) : (
        <EmployeeTable rows={sorted} isRu={isRu} period={period} />
      )}
    </EmployeePageShell>
  );
}
