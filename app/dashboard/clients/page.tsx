import { getDashboardUser } from "@/lib/dashboard";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { getToken, getClients } from "@/lib/billz";
import { Users } from "lucide-react";
import ClientsTable from "./ClientsTable";

export default async function ClientsPage() {
  const user = await getDashboardUser();
  if (!user) redirect("/auth/error");
  if (!user.billzToken) redirect("/auth/error");

  const lang = getLang(user);
  const isRu = lang === "ru";

  const token = await getToken(user.billzToken, String(user.telegramId));

  let clients: Awaited<ReturnType<typeof getClients>>["clients"] = [];
  let total = 0;
  let error = false;

  try {
    const result = await getClients(token, String(user.telegramId), 500, 1);
    clients = result.clients;
    total = result.count;
  } catch {
    error = true;
  }

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
              {isRu ? `${total} клиент(ов) в базе` : `Bazada ${total} ta mijoz`}
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "#1A0A0A", border: "1px solid #3B1111", color: "#F87171" }}
        >
          {isRu ? "Ошибка загрузки данных. Попробуйте позже." : "Ma'lumot yuklashda xatolik. Qayta urinib ko'ring."}
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "#0D1526" }}
          >
            <Users size={24} style={{ color: "#334155" }} />
          </div>
          <p className="text-sm" style={{ color: "#475569" }}>
            {isRu ? "Клиентов пока нет" : "Mijozlar yo'q"}
          </p>
        </div>
      ) : (
        <ClientsTable clients={clients} isRu={isRu} />
      )}
    </div>
  );
}
