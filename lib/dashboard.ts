import { connectDB } from "@/lib/db";
import User, { IUser } from "@/models/user";
import Report, { IReport } from "@/models/Report";
import { getSession } from "@/lib/session";

export async function getDashboardUser(): Promise<IUser | null> {
  const session = await getSession();
  if (!session) return null;
  await connectDB();
  return User.findOne({ telegramId: session.telegramId }).lean();
}

export async function getLatestReport(telegramId: number, billzToken?: string | null): Promise<IReport | null> {
  const query = billzToken ? { telegramId, billzToken } : { telegramId };
  return Report.findOne(query).sort({ createdAt: -1 }).lean();
}

export async function getRecentReports(telegramId: number, limit = 7, billzToken?: string | null): Promise<IReport[]> {
  const match = billzToken ? { telegramId, billzToken } : { telegramId };
  // Deduplicate by date — only keep the latest report per day
  return Report.aggregate([
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$today.date", doc: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$doc" } },
    { $sort: { "today.date": -1 } },
    { $limit: limit },
  ]);
}
