import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/user";
import { generateReportForUser } from "@/services/generateReport";
import { formatDeadStock, formatOverstock } from "@/lib/insights";
import { formatDailyStats, formatRevenueDiff } from "@/services/reportService";
import { getLang } from "@/lib/i18n";
import { bot } from "@/lib/bot";

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const currentHour = new Date().getUTCHours() + 5; // UTC+5 (Tashkent)
  const normalizedHour = currentHour % 24;

  const users = await User.find({ billzToken: { $ne: null }, reportHour: normalizedHour });

  if (users.length === 0) {
    return NextResponse.json({ ok: true, message: "No users for this hour", hour: normalizedHour });
  }

  const results: { telegramId: number; ok: boolean; error?: string }[] = [];

  for (const user of users) {
    try {
      const { report, summary, deadStock, overstock } = await generateReportForUser(user, "cron");

      const lang = getLang(user);
      const todayLabel = lang === "ru" ? "📅 Сегодня" : "📅 Bugun";
      const yesterdayLabel = lang === "ru" ? "📅 Вчера" : "📅 Kecha";
      const todayMsg = formatDailyStats(summary.today, todayLabel, lang);
      const diff = formatRevenueDiff(summary, lang);

      await bot.telegram.sendMessage(
        user.telegramId,
        diff ? `${todayMsg}\n\n${diff}` : todayMsg
      );
      await bot.telegram.sendMessage(user.telegramId, formatDailyStats(summary.yesterday, yesterdayLabel, lang));
      await bot.telegram.sendMessage(user.telegramId, formatDeadStock(deadStock, lang));
      await bot.telegram.sendMessage(user.telegramId, formatOverstock(overstock, lang));

      const additionalText = lang === "ru" ? "Для дополнительного анализа:" : "Qo'shimcha tahlil uchun:";
      await bot.telegram.sendMessage(user.telegramId, additionalText, {
        reply_markup: {
          inline_keyboard: [[
            { text: "🤖 AI Tahlil", callback_data: `ai_summary:${report._id}` },
          ]],
        },
      });

      results.push({ telegramId: user.telegramId, ok: true });
    } catch (err) {
      console.error(`[cron] failed for user ${user.telegramId}:`, err);
      results.push({ telegramId: user.telegramId, ok: false, error: String(err) });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
