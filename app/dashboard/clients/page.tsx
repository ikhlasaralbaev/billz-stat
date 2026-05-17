import { getDashboardUser } from "@/lib/dashboard";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { connectDB } from "@/lib/db";
import ClientSnapshot from "@/models/ClientSnapshot";
import { Users } from "lucide-react";
import ClientsTable, { ClientSnapshotRow } from "./ClientsTable";
import ClientsSyncButton from "./ClientsSyncButton";
import ClientsAnalysisDashboard from "./ClientsAnalysisDashboard";
import { getLatestClientsAnalysis } from "./clientsAnalysisAction";

export default async function ClientsPage() {
  const user = await getDashboardUser();
  if (!user) redirect("/auth/error");
  if (!user.billzToken) redirect("/auth/error");

  const lang = getLang(user);
  const isRu = lang === "ru";

  const { result: latestAnalysis, analyzedAt } = await getLatestClientsAnalysis();

  await connectDB();
  const raw = await ClientSnapshot.find(
    { telegramId: user.telegramId, billzToken: user.billzToken },
    {
      clientId: 1, firstName: 1, lastName: 1, phoneNumbers: 1,
      balance: 1, lastTransactionDate: 1, firstTransactionDate: 1,
      totalSpend: 1, orderCount: 1, returnCount: 1, avgOrderValue: 1,
    }
  ).lean();

  const clients: ClientSnapshotRow[] = raw.map((s) => ({
    id: String(s._id),
    clientId: s.clientId,
    firstName: s.firstName ?? null,
    lastName: s.lastName ?? null,
    phoneNumbers: s.phoneNumbers ?? [],
    balance: s.balance ?? 0,
    lastTransactionDate: s.lastTransactionDate ?? null,
    firstTransactionDate: s.firstTransactionDate ?? null,
    totalSpend: s.totalSpend ?? 0,
    orderCount: s.orderCount ?? 0,
    returnCount: s.returnCount ?? 0,
    avgOrderValue: s.avgOrderValue ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "#1E1B4B" }}
          >
            <Users size={14} style={{ color: "#A5B4FC" }} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">
              {isRu ? "Клиенты" : "Mijozlar"}
            </h1>
            <p className="text-xs" style={{ color: "#64748B" }}>
              {clients.length > 0
                ? isRu
                  ? `${clients.length} клиент(ов) в базе`
                  : `Bazada ${clients.length} ta mijoz`
                : isRu
                  ? "Данные не загружены"
                  : "Ma'lumotlar yuklanmagan"}
            </p>
          </div>
        </div>
        <ClientsSyncButton isRu={isRu} />
      </div>

      <ClientsAnalysisDashboard
        initialAnalysis={latestAnalysis}
        analyzedAt={analyzedAt}
        isRu={isRu}
      />

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "#0D1526" }}
          >
            <Users size={24} style={{ color: "#334155" }} />
          </div>
          <p className="text-sm text-center" style={{ color: "#475569" }}>
            {isRu
              ? "Нажмите «Загрузить данные клиентов» чтобы начать"
              : "Mijozlar ma'lumotlarini yuklash tugmasini bosing"}
          </p>
        </div>
      ) : (
        <>
          <div
            className="flex items-center gap-2 pt-2"
            style={{ borderTop: "1px solid #1E293B" }}
          >
            <span className="text-xs font-semibold" style={{ color: "#334155" }}>
              {isRu ? "Список клиентов" : "Mijozlar ro'yxati"}
            </span>
          </div>
          <ClientsTable clients={clients} isRu={isRu} />
        </>
      )}
    </div>
  );
}
