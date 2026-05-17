import { connectDB } from "@/lib/db";
import User from "@/models/user";
import Link from "next/link";
import { Users, ShieldCheck, UserCheck, ArrowRight } from "lucide-react";

async function getStats() {
  await connectDB();
  const [total, admins, recent] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "ADMIN" }),
    User.find({}, { telegramId: 1, firstName: 1, lastName: 1, username: 1, role: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);
  return { total, admins, regular: total - admins, recent };
}

export default async function AdminOverviewPage() {
  const { total, admins, regular, recent } = await getStats();

  const cards = [
    {
      label: "Jami foydalanuvchilar",
      value: total,
      Icon: Users,
      color: "#6366F1",
      bg: "#6366F115",
      border: "#6366F125",
    },
    {
      label: "Adminlar",
      value: admins,
      Icon: ShieldCheck,
      color: "#EF4444",
      bg: "#EF444415",
      border: "#EF444425",
    },
    {
      label: "Oddiy userlar",
      value: regular,
      Icon: UserCheck,
      color: "#10B981",
      bg: "#10B98115",
      border: "#10B98125",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Umumiy ko'rinish</h2>
        <p className="text-sm" style={{ color: "#64748B" }}>Tizim statistikasi</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(({ label, value, Icon, color, bg, border }) => (
          <div
            key={label}
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: "#0A0F1E", border: `1px solid #1E293B` }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: bg, border: `1px solid ${border}` }}
            >
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent users */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#0A0F1E", border: "1px solid #1E293B" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #1E293B" }}
        >
          <h3 className="text-sm font-semibold text-white">So'nggi qo'shilgan userlar</h3>
          <Link
            href="/admin/users"
            className="flex items-center gap-1 text-xs font-medium transition-colors"
            style={{ color: "#6366F1" }}
          >
            Barchasini ko'rish <ArrowRight size={12} />
          </Link>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #1E293B" }}>
              {["Ism", "Username", "Telegram ID", "Role", "Sana"].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-xs font-medium"
                  style={{ color: "#475569" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.map((u) => (
              <tr
                key={String(u._id)}
                style={{ borderBottom: "1px solid #0D1526" }}
              >
                <td className="px-5 py-3 text-white">
                  {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                </td>
                <td className="px-5 py-3" style={{ color: "#64748B" }}>
                  {u.username ? `@${u.username}` : "—"}
                </td>
                <td className="px-5 py-3 font-mono text-xs" style={{ color: "#64748B" }}>
                  {u.telegramId}
                </td>
                <td className="px-5 py-3">
                  <span
                    className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={
                      u.role === "ADMIN"
                        ? { background: "#EF444415", color: "#FCA5A5", border: "1px solid #EF444425" }
                        : { background: "#1E293B", color: "#64748B" }
                    }
                  >
                    {u.role ?? "USER"}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs" style={{ color: "#475569" }}>
                  {new Date(u.createdAt as Date).toLocaleDateString("uz-UZ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
