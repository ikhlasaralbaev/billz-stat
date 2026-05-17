"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, User, Search, RefreshCw } from "lucide-react";

interface UserRow {
  telegramId: number;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers]       = useState<UserRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [updating, setUpdating] = useState<number | null>(null);
  const router = useRouter();

  async function fetchUsers() {
    setLoading(true);
    const res  = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }

  async function toggleRole(user: UserRow) {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    setUpdating(user.telegramId);
    await fetch("/api/admin/users/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: user.telegramId, role: newRole }),
    });
    setUsers((prev) =>
      prev.map((u) => (u.telegramId === user.telegramId ? { ...u, role: newRole } : u))
    );
    setUpdating(null);
  }

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      String(u.telegramId).includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Foydalanuvchilar</h2>
          <p className="text-sm" style={{ color: "#64748B" }}>Jami: {users.length} ta</p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          style={{ background: "#1E293B", color: "#94A3B8", border: "1px solid #1E293B" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#263348")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1E293B")}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Yangilash
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#475569" }} />
        <input
          type="text"
          placeholder="Ism, username yoki Telegram ID bo'yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "#0A0F1E", border: "1px solid #1E293B", color: "#E2E8F0" }}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0A0F1E", border: "1px solid #1E293B" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16" style={{ color: "#475569" }}>
            <RefreshCw size={18} className="animate-spin mr-2" />
            <span className="text-sm">Yuklanmoqda...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: "#475569" }}>
            <User size={32} />
            <p className="text-sm">Foydalanuvchi topilmadi</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #1E293B" }}>
                {["Foydalanuvchi", "Username", "Telegram ID", "Role", "Qo'shilgan", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: "#475569" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr
                  key={user.telegramId}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("button")) return;
                    router.push(`/admin/users/${user.telegramId}`);
                  }}
                  className="cursor-pointer"
                  style={{ borderBottom: "1px solid #0D1526" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#0D1526")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Name + avatar */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                        style={
                          user.role === "ADMIN"
                            ? { background: "#EF444420", color: "#FCA5A5" }
                            : { background: "#1E293B", color: "#94A3B8" }
                        }
                      >
                        {(user.firstName?.[0] ?? user.username?.[0] ?? "?").toUpperCase()}
                      </div>
                      <span className="text-white font-medium">
                        {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-3" style={{ color: "#64748B" }}>
                    {user.username ? `@${user.username}` : "—"}
                  </td>

                  <td className="px-5 py-3 font-mono text-xs" style={{ color: "#64748B" }}>
                    {user.telegramId}
                  </td>

                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={
                        user.role === "ADMIN"
                          ? { background: "#EF444415", color: "#FCA5A5", border: "1px solid #EF444425" }
                          : { background: "#1E293B", color: "#64748B", border: "1px solid #1E293B" }
                      }
                    >
                      {user.role === "ADMIN" && <ShieldCheck size={10} />}
                      {user.role ?? "USER"}
                    </span>
                  </td>

                  <td className="px-5 py-3 text-xs" style={{ color: "#475569" }}>
                    {new Date(user.createdAt).toLocaleDateString("uz-UZ")}
                  </td>

                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => toggleRole(user)}
                      disabled={updating === user.telegramId}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40"
                      style={
                        user.role === "ADMIN"
                          ? { background: "#EF444415", color: "#FCA5A5", border: "1px solid #EF444425" }
                          : { background: "#6366F115", color: "#A5B4FC", border: "1px solid #6366F125" }
                      }
                    >
                      {updating === user.telegramId
                        ? "..."
                        : user.role === "ADMIN"
                        ? "USER qilish"
                        : "ADMIN qilish"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
