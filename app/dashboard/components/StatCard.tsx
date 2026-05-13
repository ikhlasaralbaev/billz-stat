import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  unit: string;
  full?: string;
  diff?: { pct: string; isUp: boolean } | null;
  sub?: string;
  Icon: LucideIcon;
  accent: string;
}

export default function StatCard({ label, value, unit, full, diff, sub, Icon, accent }: StatCardProps) {
  return (
    <div
      className="rounded-2xl p-5 space-y-3 relative overflow-hidden"
      style={{ background: "#0D1526", border: "1px solid #1E293B" }}
    >
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl pointer-events-none"
        style={{ background: accent, transform: "translate(30%, -30%)" }}
      />

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "#64748B" }}>{label}</span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}18` }}
        >
          <Icon size={15} style={{ color: accent }} />
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
          <span className="text-xs" style={{ color: "#475569" }}>{unit}</span>
        </div>
        {full && (
          <p className="text-xs mt-0.5 truncate" style={{ color: "#334155" }} title={full}>{full}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {diff && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{
              background: diff.isUp ? "#022C22" : "#2D1219",
              color: diff.isUp ? "#34D399" : "#F87171",
            }}
          >
            {diff.isUp ? "▲" : "▼"} {diff.pct}%
          </span>
        )}
        {sub && (
          <span className="text-xs font-medium" style={{ color: accent }}>{sub}</span>
        )}
      </div>
    </div>
  );
}
