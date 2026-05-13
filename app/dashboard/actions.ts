"use server";

import { getDashboardUser } from "@/lib/dashboard";
import { generateReportForUser } from "@/services/generateReport";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function generateReportAction() {
  const user = await getDashboardUser();
  if (!user) redirect("/auth/error");
  if (!user.billzToken) throw new Error("No billzToken");

  await generateReportForUser(user, "command");
  revalidatePath("/dashboard", "layout");
}
