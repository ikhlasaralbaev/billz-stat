"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton({ lang }: { lang: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/error");
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
      style={{ color: "#64748B", background: "#1E293B" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#E2E8F0")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
    >
      <LogOut size={13} />
      <span className="hidden sm:inline">{lang === "ru" ? "Выйти" : "Chiqish"}</span>
    </button>
  );
}
