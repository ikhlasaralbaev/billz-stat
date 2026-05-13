"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import User from "@/models/user";
import { getSession } from "@/lib/session";
import { v4 as uuidv4 } from "uuid";

async function getSessionUser() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  await connectDB();
  const user = await User.findOne({ telegramId: session.telegramId });
  if (!user) throw new Error("User not found");
  return user;
}

export async function updateLanguage(lang: "uz" | "ru") {
  const user = await getSessionUser();
  await User.findByIdAndUpdate(user._id, { language: lang });
  revalidatePath("/dashboard", "layout");
}

export async function updateReportHour(hour: number) {
  const user = await getSessionUser();
  await User.findByIdAndUpdate(user._id, { reportHour: hour });
  revalidatePath("/dashboard/settings");
}

export async function updateShops(shops: { id: string; name: string }[]) {
  const user = await getSessionUser();
  await User.findByIdAndUpdate(user._id, {
    selectedShopIds: shops.map((s) => s.id),
    selectedShopNames: shops.map((s) => s.name),
  });
  revalidatePath("/dashboard", "layout");
}

export async function regenerateWebToken(): Promise<string> {
  const user = await getSessionUser();
  const webToken = uuidv4();
  await User.findByIdAndUpdate(user._id, { webToken });
  revalidatePath("/dashboard/settings");
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/auth?token=${webToken}`;
}
