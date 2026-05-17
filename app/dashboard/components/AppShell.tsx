"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut, LayoutDashboard, Package, ShoppingCart, FileText, Menu, X, TrendingUp, Settings, Bot, Users, UserCheck, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

interface NavItem {
  href: string;
  labelUz: string;
  labelRu: string;
  Icon: React.ElementType;
}

const NAV: NavItem[] = [
  { href: "/dashboard", labelUz: "Dashboard", labelRu: "Дашборд", Icon: LayoutDashboard },
  { href: "/dashboard/products", labelUz: "Mahsulotlar", labelRu: "Товары", Icon: Package },
  { href: "/dashboard/sales", labelUz: "Sotuvlar", labelRu: "Продажи", Icon: ShoppingCart },
  { href: "/dashboard/reports", labelUz: "Hisobotlar", labelRu: "Отчёты", Icon: FileText },
  { href: "/dashboard/employees", labelUz: "Xodimlar", labelRu: "Сотрудники", Icon: Users },
  { href: "/dashboard/clients", labelUz: "Mijozlar", labelRu: "Клиенты", Icon: UserCheck },
  { href: "/dashboard/ai", labelUz: "AI Tahlil", labelRu: "AI Анализ", Icon: Bot },
  { href: "/dashboard/settings", labelUz: "Sozlamalar", labelRu: "Настройки", Icon: Settings },
];

interface Props {
  children: React.ReactNode;
  lang: string;
  displayName: string;
  initial: string;
  isAdmin?: boolean;
}

export default function AppShell({ children, lang, displayName, initial, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [navProgress, setNavProgress] = useState(0); // 0 = hidden, 1-99 = loading, 100 = done
  const pathname = usePathname();
  const router = useRouter();
  const isRu = lang === "ru";
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPathname = useRef(pathname);

  // Start animated progress bar
  function startProgress() {
    if (progressTimer.current) clearInterval(progressTimer.current);
    setNavProgress(15);
    let val = 15;
    progressTimer.current = setInterval(() => {
      val = Math.min(val + Math.random() * 12, 85);
      setNavProgress(val);
    }, 300);
  }

  // Complete and hide progress bar
  function finishProgress() {
    if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }
    setNavProgress(100);
    setTimeout(() => setNavProgress(0), 400);
  }

  // Complete bar when pathname changes
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      finishProgress();
    }
  }, [pathname]);

  // Intercept all internal link clicks
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || anchor.target === "_blank") return;
      if (href === pathname || href === window.location.pathname) return;
      startProgress();
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  async function handleLogout() {
    startProgress();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/error");
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#070B14", color: "#E2E8F0" }}>

      {/* Navigation progress bar */}
      {navProgress > 0 && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            height: 2,
            width: `${navProgress}%`,
            background: "linear-gradient(90deg, #6366F1, #8B5CF6, #A78BFA)",
            boxShadow: "0 0 8px #6366F199",
            zIndex: 99999,
            transition: navProgress === 100 ? "width 200ms ease, opacity 400ms ease" : "width 300ms ease",
            opacity: navProgress === 100 ? 0 : 1,
          }}
        />
      )}

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col w-60 transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "#0A0F1E", borderRight: "1px solid #1E293B" }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5" style={{ borderBottom: "1px solid #1E293B" }}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
          >
            <TrendingUp size={15} className="text-white" />
          </div>
          <span className="font-semibold text-white tracking-tight">Billz Insight</span>
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
          {NAV.map(({ href, labelUz, labelRu, Icon }) => {
            const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: isActive ? "#6366F11A" : "transparent",
                  color: isActive ? "#A5B4FC" : "#64748B",
                  border: isActive ? "1px solid #6366F130" : "1px solid transparent",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "#CBD5E1"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "#64748B"; }}
              >
                <Icon size={16} />
                {isRu ? labelRu : labelUz}
              </Link>
            );
          })}
        </nav>

        {/* Admin panel link */}
        {isAdmin && (
          <div className="px-3 pb-2" style={{ borderTop: "1px solid #1E293B", paddingTop: "12px" }}>
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: "#EF444412", color: "#FCA5A5", border: "1px solid #EF444425" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#EF44441F")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#EF444412")}
            >
              <ShieldCheck size={16} />
              {isRu ? "Админ панель" : "Admin panel"}
            </Link>
          </div>
        )}

        {/* User block */}
        <div className="px-3 py-4" style={{ borderTop: isAdmin ? "none" : "1px solid #1E293B" }}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "#0D1526" }}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
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
              title={isRu ? "Выйти" : "Chiqish"}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar (mobile) */}
        <header
          className="h-16 flex items-center justify-between px-4 sm:px-6 lg:hidden shrink-0"
          style={{ background: "rgba(7,11,20,0.9)", borderBottom: "1px solid #1E293B", backdropFilter: "blur(12px)" }}
        >
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg"
            style={{ color: "#94A3B8", background: "#1E293B" }}
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
            >
              <TrendingUp size={13} className="text-white" />
            </div>
            <span className="font-semibold text-white text-sm">Billz Insight</span>
          </div>
          <div className="w-9" />
        </header>

        {/* Scrollable content */}
        <main className="flex-1 flex flex-col overflow-hidden" style={{ position: "relative" }}>
          <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 overflow-y-auto">
            {children}
          </div>

          {/* Loading overlay */}
          {navProgress > 0 && navProgress < 100 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(7,11,20,0.55)",
                backdropFilter: "blur(1px)",
                zIndex: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "opacity 150ms",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
                  <circle cx="18" cy="18" r="15" stroke="#1E293B" strokeWidth="3" />
                  <path d="M18 3 A15 15 0 0 1 33 18" stroke="url(#g)" strokeWidth="3" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="g" x1="18" y1="3" x2="33" y2="18" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#6366F1" />
                      <stop offset="1" stopColor="#A78BFA" />
                    </linearGradient>
                  </defs>
                </svg>
                <span style={{ fontSize: 12, color: "#64748B", letterSpacing: "0.05em" }}>
                  {isRu ? "Загрузка..." : "Yuklanmoqda..."}
                </span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* AI floating button — hidden on AI page */}
      {!pathname.startsWith("/dashboard/ai") && (
        <Link
          href="/dashboard/ai"
          className="fixed bottom-6 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg transition-all"
          style={{
            background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
            boxShadow: "0 4px 24px #6366F155",
          }}
        >
          <Bot size={18} className="text-white" />
          <span className="text-sm font-semibold text-white">AI</span>
        </Link>
      )}

    </div>
  );
}
