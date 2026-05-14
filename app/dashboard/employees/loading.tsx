"use client";

import { useEffect, useState } from "react";

const STEPS_UZ = [
  { icon: "📡", text: "Billz serveriga ulanilmoqda..." },
  { icon: "🔄", text: "Sotuvchilar ma'lumotlari yuklanmoqda..." },
  { icon: "🧮", text: "Ko'rsatkichlar hisoblanmoqda..." },
  { icon: "📊", text: "Samaradorlik tahlil qilinmoqda..." },
  { icon: "🔍", text: "Anomaliyalar aniqlanmoqda..." },
];

const STEPS_RU = [
  { icon: "📡", text: "Подключаемся к серверу Billz..." },
  { icon: "🔄", text: "Загружаем данные продавцов..." },
  { icon: "🧮", text: "Считаем показатели..." },
  { icon: "📊", text: "Анализируем эффективность..." },
  { icon: "🔍", text: "Обнаруживаем аномалии..." },
];

export default function EmployeesLoading() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [isRu, setIsRu] = useState(false);

  useEffect(() => {
    const lang = document.querySelector("[data-lang]")?.getAttribute("data-lang");
    setIsRu(lang === "ru");
  }, []);

  const STEPS = isRu ? STEPS_RU : STEPS_UZ;

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setStep((s) => Math.min(s + 1, STEPS.length - 1));
        setVisible(true);
      }, 300);
    }, 1800);
    return () => clearInterval(interval);
  }, [STEPS.length]);

  const progress = Math.min(((step + 1) / STEPS.length) * 100, 95);

  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: "60vh" }}>
      <div className="relative mb-8">
        <div
          className="w-20 h-20 rounded-full"
          style={{
            background: "conic-gradient(from 0deg, #6366F1, #8B5CF6, #A78BFA, #6366F1)",
            animation: "spin 2s linear infinite",
            padding: 3,
          }}
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center text-2xl"
            style={{ background: "#070B14" }}
          >
            <span style={{ transition: "opacity 0.3s ease", opacity: visible ? 1 : 0 }}>
              {STEPS[step].icon}
            </span>
          </div>
        </div>
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle, #6366F133 0%, transparent 70%)", animation: "pulse 2s ease-in-out infinite" }}
        />
      </div>

      <div className="h-6 flex items-center justify-center mb-6">
        <p
          className="text-sm font-medium text-center px-4"
          style={{ color: "#A5B4FC", transition: "opacity 0.3s ease", opacity: visible ? 1 : 0 }}
        >
          {STEPS[step].text}
        </p>
      </div>

      <div className="w-56 rounded-full overflow-hidden" style={{ background: "#0D1526", height: 3 }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${progress}%`, background: "linear-gradient(90deg, #6366F1, #8B5CF6)", transition: "width 1.6s ease" }}
        />
      </div>

      <div className="flex gap-1.5 mt-4">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: i === step ? 16 : 4,
              height: 4,
              background: i === step ? "#6366F1" : i < step ? "#334155" : "#1E293B",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { transform: scale(1); opacity:.4; } 50% { transform: scale(1.3); opacity:.8; } }
      `}</style>
    </div>
  );
}
