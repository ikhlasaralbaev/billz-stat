"use client";

export default function PrintControls({ isRu }: { isRu: boolean }) {
  return (
    <div
      style={{
        background: "#1E1B4B",
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
      className="no-print"
    >
      <button
        onClick={() => window.print()}
        style={{
          background: "#6366F1",
          color: "white",
          border: "none",
          padding: "8px 20px",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {isRu ? "⬇ Скачать PDF" : "⬇ PDF yuklash"}
      </button>
      <button
        onClick={() => window.close()}
        style={{
          background: "transparent",
          color: "#94A3B8",
          border: "1px solid #334155",
          padding: "8px 16px",
          borderRadius: 6,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {isRu ? "Закрыть" : "Yopish"}
      </button>
      <span style={{ color: "#475569", fontSize: 12, marginLeft: "auto" }}>
        {isRu ? "Предварительный просмотр — сохраните как PDF из диалога печати" : "Ko'rinish — chop etish oynasidan PDF sifatida saqlang"}
      </span>
    </div>
  );
}
