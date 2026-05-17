"use client";

import { useState } from "react";
import { UserIcon, Phone, Key, Store, FileText, Zap, MessageSquare, ShieldCheck, Clock } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface PlainUser {
  telegramId: number;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  username: string | null;
  phoneNumber: string | null;
  language: string | null;
  role: string;
  billzToken: string | null;
  webToken: string | null;
  reportHour: number;
  selectedShopNames: string[];
  createdAt: string;
  totalTokensSpent: number;
}

export interface PlainReport {
  id: string;
  source: string;
  date: string;
  createdAt: string;
  shopsCount: number;
  grossSales: number;
  grossProfit: number;
  ordersCount: number;
  deadStockCount: number;
  overstockCount: number;
}

export interface PlainAiAnalysis {
  id: string;
  aiModel: string;
  totalTokens: number;
  durationMs: number;
  responseText: string;
  generatedAt: string;
}

export interface PlainAiMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  totalTokens?: number;
  durationMs?: number;
  createdAt: string;
}

interface Props {
  user: PlainUser;
  reports: PlainReport[];
  aiAnalyses: PlainAiAnalysis[];
  aiMessages: PlainAiMessage[];
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

const LANG: Record<string, string> = { uz: "O'zbek", ru: "Русский" };

const pad = (n: number) => String(n).padStart(2, "0");

// Deterministik formatter — locale ga bog'liq emas (hydration-safe)
function fmtDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 5 * 3600 * 1000); // UTC+5
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function fmtTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 5 * 3600 * 1000);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function fmtNum(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function mask(token: string | null) {
  if (!token) return "—";
  if (token.length <= 8) return token;
  return token.slice(0, 6) + "••••••••" + token.slice(-4);
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function InfoRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div
      className="flex items-start justify-between gap-6 py-2.5"
      style={{ borderBottom: "1px solid #0D1526" }}
    >
      <span className="text-xs shrink-0 w-32" style={{ color: "#475569" }}>{label}</span>
      <span
        className={`text-xs text-right break-all ${mono ? "font-mono" : ""}`}
        style={{ color: highlight ? "#A5B4FC" : "#94A3B8" }}
      >
        {value}
      </span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#0A0F1E", border: "1px solid #1E293B" }}>
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ borderBottom: "1px solid #1E293B" }}>
      <Icon size={14} style={{ color: "#475569" }} />
      <h3 className="text-sm font-semibold text-white">{title}</h3>
    </div>
  );
}

/* ── Tab contents ───────────────────────────────────────────────────────── */

function ProfileTab({ user }: { user: PlainUser }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      <Card>
        <CardHeader icon={UserIcon} title="Asosiy ma'lumotlar" />
        <div className="px-5 py-2">
          <InfoRow label="Telegram ID"  value={String(user.telegramId)} mono />
          <InfoRow label="Ism"          value={user.firstName  ?? "—"} />
          <InfoRow label="Familiya"     value={user.lastName   ?? "—"} />
          <InfoRow label="To'liq ism"   value={user.fullName   ?? "—"} />
          <InfoRow label="Username"     value={user.username ? `@${user.username}` : "—"} />
          <InfoRow label="Til"          value={LANG[user.language ?? ""] ?? user.language ?? "—"} />
          <InfoRow label="Role"         value={user.role} />
          <InfoRow label="Ro'yxat sana" value={fmtDate(user.createdAt)} />
          <InfoRow
            label="Claude tokenlari"
            value={user.totalTokensSpent > 0 ? fmtNum(user.totalTokensSpent) + " token" : "—"}
            highlight={user.totalTokensSpent > 0}
          />
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader icon={Phone} title="Kontakt" />
          <div className="px-5 py-2">
            <InfoRow label="Telefon" value={user.phoneNumber ?? "—"} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={Key} title="Kalit va tokenlar" />
          <div className="px-5 py-2">
            <InfoRow label="Billz token"   value={mask(user.billzToken)} mono />
            <InfoRow label="Web token"     value={mask(user.webToken)} mono />
            <InfoRow label="Hisobot soati" value={`${user.reportHour}:00`} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={Store} title={`Do'konlar (${user.selectedShopNames.length})`} />
          <div className="px-5 py-4">
            {user.selectedShopNames.length === 0 ? (
              <p className="text-xs" style={{ color: "#475569" }}>Do'kon tanlanmagan</p>
            ) : (
              <div className="space-y-1.5">
                {user.selectedShopNames.map((name, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                    style={{ background: "#0D1526", color: "#94A3B8" }}
                  >
                    <Store size={11} style={{ color: "#475569" }} />
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ReportsTab({ reports }: { reports: PlainReport[] }) {
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: "#475569" }}>
        <FileText size={32} />
        <p className="text-sm">Hozircha hisobot yo'q</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div
          key={r.id}
          className="rounded-2xl p-5"
          style={{ background: "#0A0F1E", border: "1px solid #1E293B" }}
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-white">{r.date}</span>
              <span className="text-xs" style={{ color: "#475569" }}>
                {fmtTime(r.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={
                  r.source === "cron"
                    ? { background: "#10B98115", color: "#6EE7B7" }
                    : { background: "#6366F115", color: "#A5B4FC" }
                }
              >
                {r.source === "cron" ? "Avtomatik" : "Qo'lda"}
              </span>
              <span className="text-xs" style={{ color: "#475569" }}>{r.shopsCount} ta do'kon</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { label: "Sotuv",       value: `${fmtNum(r.grossSales)} so'm` },
              { label: "Foyda",       value: `${fmtNum(r.grossProfit)} so'm` },
              { label: "Cheklar",     value: String(r.ordersCount) },
              { label: "Dead stock",  value: String(r.deadStockCount) },
              { label: "Overstock",   value: String(r.overstockCount) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: "#070B14" }}>
                <p className="text-xs mb-1" style={{ color: "#475569" }}>{label}</p>
                <p className="text-xs font-semibold text-white truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AiAnalysesTab({ analyses }: { analyses: PlainAiAnalysis[] }) {
  if (analyses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: "#475569" }}>
        <Zap size={32} />
        <p className="text-sm">AI tahlil yo'q</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {analyses.map((a) => (
        <div
          key={a.id}
          className="rounded-2xl p-5"
          style={{ background: "#0A0F1E", border: "1px solid #1E293B" }}
        >
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-lg" style={{ background: "#0D1526", color: "#64748B" }}>
              {a.aiModel}
            </span>
            <div className="flex items-center gap-4 text-xs" style={{ color: "#475569" }}>
              <span className="flex items-center gap-1">
                <Zap size={10} /> {fmtNum(a.totalTokens)} tokens
              </span>
              <span className="flex items-center gap-1">
                <Clock size={10} /> {((a.durationMs ?? 0) / 1000).toFixed(1)}s
              </span>
              <span>{fmtDate(a.generatedAt)}</span>
            </div>
          </div>
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "#94A3B8" }}>
            {a.responseText}
          </p>
        </div>
      ))}
    </div>
  );
}

function AiChatTab({ messages }: { messages: PlainAiMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: "#475569" }}>
        <MessageSquare size={32} />
        <p className="text-sm">AI bilan suhbat yo'q</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {[...messages].reverse().map((m) => (
        <div
          key={m.id}
          className={`rounded-xl px-4 py-3 text-xs leading-relaxed ${m.role === "user" ? "ml-12" : "mr-12"}`}
          style={
            m.role === "user"
              ? { background: "#6366F115", color: "#C7D2FE", border: "1px solid #6366F125" }
              : { background: "#0A0F1E", color: "#94A3B8", border: "1px solid #1E293B" }
          }
        >
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <span className="font-semibold" style={{ color: m.role === "user" ? "#A5B4FC" : "#475569" }}>
              {m.role === "user" ? "User" : "AI"}
            </span>
            <span style={{ color: "#334155", fontSize: "10px" }}>
              {fmtDate(m.createdAt)}
            </span>
          </div>
          <p className="whitespace-pre-wrap">{m.text}</p>
          {m.role === "ai" && m.totalTokens && (
            <p className="mt-1.5" style={{ color: "#334155", fontSize: "10px" }}>
              {m.totalTokens} tokens · {((m.durationMs ?? 0) / 1000).toFixed(1)}s
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */

const TABS = [
  { id: "profile",   label: "Profil",         Icon: UserIcon },
  { id: "reports",   label: "Hisobotlar",      Icon: FileText },
  { id: "analyses",  label: "AI Tahlillar",    Icon: Zap },
  { id: "chat",      label: "AI Suhbat",       Icon: MessageSquare },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function UserDetailClient({ user, reports, aiAnalyses, aiMessages }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const counts: Record<TabId, number | null> = {
    profile:  null,
    reports:  reports.length,
    analyses: aiAnalyses.length,
    chat:     aiMessages.length,
  };

  return (
    <div className="space-y-6">

      {/* User hero */}
      <div
        className="rounded-2xl p-6 flex items-start gap-5"
        style={{ background: "#0A0F1E", border: "1px solid #1E293B" }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0"
          style={
            user.role === "ADMIN"
              ? { background: "#EF444420", color: "#FCA5A5" }
              : { background: "#6366F120", color: "#A5B4FC" }
          }
        >
          {([user.firstName, user.lastName].filter(Boolean).join(" ") || "?")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-white">
              {[user.firstName, user.lastName].filter(Boolean).join(" ") || "Nomsiz"}
            </h2>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={
                user.role === "ADMIN"
                  ? { background: "#EF444415", color: "#FCA5A5", border: "1px solid #EF444425" }
                  : { background: "#1E293B", color: "#64748B", border: "1px solid #1E293B" }
              }
            >
              {user.role === "ADMIN" && <ShieldCheck size={10} />}
              {user.role}
            </span>
          </div>
          {user.username && (
            <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>@{user.username}</p>
          )}
          <p className="text-xs mt-2" style={{ color: "#475569" }}>
            Ro'yxatdan o'tgan: {fmtDate(user.createdAt)}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="flex items-center gap-1 p-1 rounded-2xl"
        style={{ background: "#0A0F1E", border: "1px solid #1E293B" }}
      >
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          const count    = counts[id];
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 justify-center"
              style={{
                background: isActive ? "#1E293B" : "transparent",
                color:      isActive ? "#E2E8F0" : "#475569",
              }}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
              {count !== null && count > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: isActive ? "#6366F130" : "#1E293B", color: isActive ? "#A5B4FC" : "#475569" }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "profile"  && <ProfileTab   user={user} />}
      {activeTab === "reports"  && <ReportsTab   reports={reports} />}
      {activeTab === "analyses" && <AiAnalysesTab analyses={aiAnalyses} />}
      {activeTab === "chat"     && <AiChatTab    messages={aiMessages} />}

    </div>
  );
}
