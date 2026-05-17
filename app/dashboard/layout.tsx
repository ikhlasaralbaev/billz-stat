import { getDashboardUser } from "@/lib/dashboard";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n";
import AppShell from "./components/AppShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getDashboardUser();
  if (!user) redirect("/auth/error");

  const lang = getLang(user);
  const displayName = user.fullName ?? user.firstName ?? "User";
  const initial = (displayName[0] ?? "U").toUpperCase();

  return (
    <div data-lang={lang}>
      <AppShell lang={lang} displayName={displayName} initial={initial} isAdmin={user.role === "ADMIN"}>
        {children}
      </AppShell>
    </div>
  );
}
