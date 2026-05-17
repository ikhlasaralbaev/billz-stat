import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/session";
import { encryptBillzToken, isEncrypted } from "@/lib/crypto";
import User from "@/models/user";
import Report from "@/models/Report";
import AiMessage from "@/models/AiMessage";
import BillzApiLog from "@/models/BillzApiLog";
import ClientAiCache from "@/models/ClientAiCache";
import ClientSnapshot from "@/models/ClientSnapshot";
import ClientOrderSnapshot from "@/models/ClientOrderSnapshot";
import SellerDayStat from "@/models/SellerDayStat";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  await connectDB();

  const users = await User.find(
    { billzToken: { $exists: true, $ne: null } },
    { telegramId: 1, billzToken: 1 }
  ).lean();

  let migrated = 0;
  let skipped = 0;
  const errors: { telegramId: number; error: string }[] = [];

  for (const user of users) {
    const oldToken = user.billzToken as string;

    if (isEncrypted(oldToken)) {
      skipped++;
      continue;
    }

    try {
      const newToken = encryptBillzToken(oldToken);

      await User.updateOne({ telegramId: user.telegramId }, { $set: { billzToken: newToken } });

      // Update all collections that store billzToken as a reference field
      const filter = { telegramId: user.telegramId, billzToken: oldToken };
      const patch = { $set: { billzToken: newToken } };

      await Promise.all([
        Report.updateMany(filter, patch),
        AiMessage.updateMany(filter, patch),
        BillzApiLog.updateMany(filter, patch),
        ClientAiCache.updateMany(filter, patch),
        ClientSnapshot.updateMany(filter, patch),
        ClientOrderSnapshot.updateMany(filter, patch),
        SellerDayStat.updateMany(filter, patch),
      ]);

      migrated++;
    } catch (err) {
      errors.push({
        telegramId: user.telegramId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ migrated, skipped, errors, total: users.length });
}
