import { redirect } from "next/navigation";
import { getDashboardUser } from "@/lib/dashboard";

export async function requireAdmin() {
  const user = await getDashboardUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return user;
}
