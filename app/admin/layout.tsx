import { requireAdmin } from "@/lib/auth";
import AdminShell from "./components/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  const displayName = user.fullName ?? user.firstName ?? "Admin";
  const initial = (displayName[0] ?? "A").toUpperCase();

  return (
    <AdminShell displayName={displayName} initial={initial}>
      {children}
    </AdminShell>
  );
}
