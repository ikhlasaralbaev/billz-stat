"use client";

import { useState } from "react";

interface DayPoint {
  date: string;
  sales: number;
  orders: number;
}

function fmtCompact(n: number): string {
  const abs = Math.abs(Math.round(n));
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return Math.round(n / 1_000) + "K";
  return String(Math.round(n));
}

function fmtNum(n: number): string {
  const s = String(Math.round(n));
  const parts: string[] = [];
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
  return parts.join(" ");
}

export default function SalesChart({
  data,
  isRu,
}: {
  data: DayPoint[];
  isRu: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (!data.length) return null;

  const W = 600;
  const H = 180;
  const PAD = { top: 24, right: 12, bottom: 36, left: 12 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map((d) => d.sales), 1);
  const maxIdx = data.reduce((mi, d, i) => (d.sales > data[mi].sales ? i : mi), 0);

  // Bar layout
  const gap = 3;
  const barW = Math.max(Math.floor((cW - gap * (data.length - 1)) / data.length), 4);
  const totalW = barW * data.length + gap * (data.length - 1);
  const offsetX = PAD.left + (cW - totalW) / 2;

  const bars = data.map((d, i) => {
    const barH = maxVal > 0 ? (d.sales / maxVal) * cH : 0;
    const x = offsetX + i * (barW + gap);
    const y = PAD.top + cH - barH;
    return { ...d, x, y, barH, barW };
  });

  // Line path over bar tops (midpoints)
  const linePoints = bars.map((b) => ({ x: b.x + b.barW / 2, y: b.barH > 0 ? b.y : PAD.top + cH }));
  const linePath = linePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${linePoints[linePoints.length - 1].x} ${PAD.top + cH} L ${linePoints[0].x} ${PAD.top + cH} Z`;

  // Date label: show all for ≤10, every other for ≤20, every 7th for ≥21
  function showLabel(i: number) {
    if (data.length <= 10) return true;
    if (data.length <= 20) return i % 2 === 0;
    return i % 7 === 0 || i === data.length - 1;
  }

  // Tooltip clamping
  const tipW = 110;
  const tipH = 46;
  function tipX(bx: number) {
    return Math.min(Math.max(bx + barW / 2 - tipW / 2, 4), W - tipW - 4);
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ overflow: "visible" }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#4338CA" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="barGradHot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity="1" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + cH - f * cH}
            y2={PAD.top + cH - f * cH}
            stroke="#1E293B"
            strokeWidth="1"
          />
        ))}

        {/* Area under trend line */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Bars */}
        {bars.map((b, i) => {
          if (b.barH < 1) return null;
          const isMax = i === maxIdx;
          const isHov = hovered === i;
          return (
            <rect
              key={i}
              x={b.x}
              y={b.y}
              width={b.barW}
              height={b.barH}
              rx={Math.min(3, b.barW / 3)}
              fill={isHov || isMax ? "url(#barGradHot)" : "url(#barGrad)"}
              opacity={hovered !== null && !isHov ? 0.45 : 1}
              style={{ cursor: "pointer", transition: "opacity 0.15s" }}
              onMouseEnter={() => setHovered(i)}
            />
          );
        })}

        {/* Trend line */}
        <path
          d={linePath}
          fill="none"
          stroke="#6366F1"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.6"
        />

        {/* Max day crown */}
        {(() => {
          const b = bars[maxIdx];
          return (
            <text
              x={b.x + b.barW / 2}
              y={b.y - 5}
              textAnchor="middle"
              fontSize="10"
              fill="#A78BFA"
            >
              ★
            </text>
          );
        })()}

        {/* Date labels */}
        {bars.map((b, i) =>
          showLabel(i) ? (
            <text
              key={i}
              x={b.x + b.barW / 2}
              y={H - 4}
              textAnchor="middle"
              fontSize="9"
              fill={hovered === i ? "#A5B4FC" : "#334155"}
            >
              {b.date.slice(5, 10)}
            </text>
          ) : null
        )}

        {/* Tooltip */}
        {hovered !== null && bars[hovered].barH > 0 && (() => {
          const b = bars[hovered];
          const tx = tipX(b.x);
          const ty = Math.max(b.y - tipH - 8, 2);
          return (
            <g>
              <rect x={tx} y={ty} width={tipW} height={tipH} rx="8"
                fill="#0D1526" stroke="#6366F130" strokeWidth="1" />
              <text x={tx + tipW / 2} y={ty + 16} textAnchor="middle"
                fontSize="11" fontWeight="700" fill="#A5B4FC">
                {fmtNum(b.sales)} UZS
              </text>
              <text x={tx + tipW / 2} y={ty + 30} textAnchor="middle"
                fontSize="9" fill="#475569">
                {b.date.slice(0, 10)} · {b.orders} {isRu ? "чек" : "chek"}
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-1 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "url(#barGrad)", backgroundColor: "#6366F1" }} />
          <span className="text-xs" style={{ color: "#334155" }}>
            {isRu ? "Продажи" : "Sotuv"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: "#A78BFA" }}>★</span>
          <span className="text-xs" style={{ color: "#334155" }}>
            {isRu ? "Лучший день" : "Eng yaxshi kun"} ({fmtCompact(data[maxIdx]?.sales ?? 0)} UZS)
          </span>
        </div>
      </div>
    </div>
  );
}
