import { getDashboardUser, getLatestReport } from "@/lib/dashboard";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { Bot } from "lucide-react";
import AiChat from "./AiChat";
import { loadMessages } from "./actions";

export default async function AiPage() {
  const user = await getDashboardUser();
  if (!user) redirect("/auth/error");

  const lang = getLang(user);
  const isRu = lang === "ru";

  const [report, initialMessages] = await Promise.all([
    getLatestReport(user.telegramId, user.billzToken),
    loadMessages(),
  ]);

  return (
    <div className="flex flex-col h-full space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#1E1B4B" }}>
          <Bot size={14} style={{ color: "#A5B4FC" }} />
        </div>
        <div>
          <h1 className="text-base font-semibold text-white">
            {isRu ? "AI Анализ" : "AI Tahlil"}
          </h1>
          <p className="text-xs" style={{ color: "#64748B" }}>
            {isRu ? "Анализ на основе последнего отчёта" : "Oxirgi hisobot asosida tahlil"}
          </p>
        </div>
      </div>

      <AiChat isRu={isRu} hasReport={!!report} initialMessages={initialMessages} />
    </div>
  );
}
