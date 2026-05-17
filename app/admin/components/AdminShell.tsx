"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Menu,
  X,
  TrendingUp,
  LogOut,
  ShieldCheck,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  Icon: React.ElementType;
}

const NAV: NavItem[] = [
  { href: "/admin",       label: "Umumiy ko'rinish", Icon: LayoutDashboard },
  { href: "/admin/users", label: "Foydalanuvchilar",  Icon: Users },
];

interface Props {
  children: React.ReactNode;
  displayName: string;
  initial: string;
}

export default function AdminShell({ children, displayName, initial }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router   = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/error");
  }

  const pageTitle = NAV.find((n) =>
    n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href)
  )?.label ?? "Admin";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#070B14", color: "#E2E8F0" }}>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col w-60 transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "#0A0F1E", borderRight: "1px solid #1E293B" }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5" style={{ borderBottom: "1px solid #1E293B" }}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}
          >
            <ShieldCheck size={15} className="text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-white tracking-tight text-sm leading-tight">Billz Insight</span>
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#EF4444" }}>Admin</span>
          </div>
          <button
            className="ml-auto lg:hidden p-1 rounded"
            style={{ color: "#64748B" }}
            onClick={() => setOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ href, label, Icon }) => {
            const isActive = href === "/admin" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: isActive ? "#EF444415" : "transparent",
                  color:      isActive ? "#FCA5A5"   : "#64748B",
                  border:     isActive ? "1px solid #EF444425" : "1px solid transparent",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "#CBD5E1"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "#64748B"; }}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}

          {/* Divider — back to app */}
          <div className="pt-3 mt-3" style={{ borderTop: "1px solid #1E293B" }}>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ color: "#475569" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#94A3B8")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
            >
              <TrendingUp size={16} />
              Dashboardga qaytish
            </Link>
          </div>
        </nav>

        {/* User block */}
        <div className="px-3 py-4" style={{ borderTop: "1px solid #1E293B" }}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "#0D1526" }}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}
            >
              {initial}
            </div>
            <span className="text-sm text-white truncate flex-1">{displayName}</span>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ color: "#475569" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#F87171")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
              title="Chiqish"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Navbar */}
        <header
          className="h-16 flex items-center justify-between px-4 sm:px-6 shrink-0"
          style={{ background: "rgba(7,11,20,0.85)", borderBottom: "1px solid #1E293B", backdropFilter: "blur(12px)" }}
        >
          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg lg:hidden"
            style={{ color: "#94A3B8", background: "#1E293B" }}
          >
            <Menu size={18} />
          </button>

          {/* Page title */}
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-white">{pageTitle}</h1>
          </div>

          {/* Right side — admin badge */}
          <div className="flex items-center gap-2">
            <span
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "#EF444415", color: "#FCA5A5", border: "1px solid #EF444425" }}
            >
              <ShieldCheck size={11} />
              Admin
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
