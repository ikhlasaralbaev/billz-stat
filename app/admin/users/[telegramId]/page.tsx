import { connectDB } from "@/lib/db";
import User from "@/models/user";
import Report from "@/models/Report";
import AiMessage from "@/models/AiMessage";
import AiAnalysis from "@/models/AiAnalysis";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import UserDetailClient, {
  PlainUser, PlainReport, PlainAiAnalysis, PlainAiMessage,
} from "./UserDetailClient";

async function getUserDetail(telegramId: number) {
  await connectDB();
  const [user, reports, aiMessages, aiAnalyses, msgTokens, analysisTokens] = await Promise.all([
    User.findOne({ telegramId }).lean(),
    Report.find({ telegramId }).sort({ createdAt: -1 }).limit(20).lean(),
    AiMessage.find({ telegramId }).sort({ createdAt: -1 }).limit(50).lean(),
    AiAnalysis.find({ telegramId }).sort({ generatedAt: -1 }).limit(20).lean(),
    AiMessage.aggregate<{ total: number }>([
      { $match: { telegramId, role: "ai", totalTokens: { $exists: true, $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$totalTokens" } } },
    ]),
    AiAnalysis.aggregate<{ total: number }>([
      { $match: { telegramId } },
      { $group: { _id: null, total: { $sum: "$totalTokens" } } },
    ]),
  ]);

  const totalTokensSpent =
    (msgTokens[0]?.total ?? 0) + (analysisTokens[0]?.total ?? 0);

  return { user, reports, aiMessages, aiAnalyses, totalTokensSpent };
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ telegramId: string }>;
}) {
  const { telegramId: rawId } = await params;
  const telegramId = Number(rawId);
  if (isNaN(telegramId)) notFound();

  const { user, reports, aiMessages, aiAnalyses, totalTokensSpent } = await getUserDetail(telegramId);
  if (!user) notFound();

  // Serialize for client component
  const plainUser: PlainUser = {
    telegramId:         user.telegramId,
    firstName:          user.firstName ?? null,
    lastName:           user.lastName  ?? null,
    fullName:           user.fullName  ?? null,
    username:           user.username  ?? null,
    phoneNumber:        user.phoneNumber ?? null,
    language:           user.language  ?? null,
    role:               user.role      ?? "USER",
    billzToken:         user.billzToken ?? null,
    webToken:           user.webToken   ?? null,
    reportHour:         user.reportHour ?? 20,
    selectedShopNames:  user.selectedShopNames ?? [],
    createdAt:          new Date(user.createdAt).toISOString(),
    totalTokensSpent,
  };

  const plainReports: PlainReport[] = reports.map((r) => ({
    id:             String(r._id),
    source:         r.source,
    date:           r.today?.date ?? new Date(r.createdAt).toLocaleDateString("uz-UZ"),
    createdAt:      new Date(r.createdAt).toISOString(),
    shopsCount:     r.shops?.length ?? 0,
    grossSales:     r.today?.grossSales    ?? 0,
    grossProfit:    r.today?.grossProfit   ?? 0,
    ordersCount:    r.today?.ordersCount   ?? 0,
    deadStockCount: r.deadStock?.length    ?? 0,
    overstockCount: r.overstock?.length    ?? 0,
  }));

  const plainAnalyses: PlainAiAnalysis[] = aiAnalyses.map((a) => ({
    id:           String(a._id),
    aiModel:      a.aiModel,
    totalTokens:  a.totalTokens,
    durationMs:   a.durationMs,
    responseText: a.responseText,
    generatedAt:  new Date(a.generatedAt).toISOString(),
  }));

  const plainMessages: PlainAiMessage[] = aiMessages.map((m) => ({
    id:          String(m._id),
    role:        m.role as "user" | "ai",
    text:        m.text,
    totalTokens: m.totalTokens,
    durationMs:  m.durationMs,
    createdAt:   new Date(m.createdAt).toISOString(),
  }));

  return (
    <div className="space-y-4">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm transition-colors"
        style={{ color: "#475569" }}
      >
        <ArrowLeft size={15} />
        Orqaga
      </Link>

      <UserDetailClient
        user={plainUser}
        reports={plainReports}
        aiAnalyses={plainAnalyses}
        aiMessages={plainMessages}
      />
    </div>
  );
}
