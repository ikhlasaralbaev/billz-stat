"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function WebAppPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Telegram injects window.Telegram.WebApp before page load in its WebView.
    // Give it a short tick to ensure the object is ready after hydration.
    const tg = (window as { Telegram?: { WebApp?: { ready: () => void; expand: () => void; initData: string } } }).Telegram?.WebApp;

    if (!tg) {
      setErrorMsg("Telegram WebApp topilmadi. Iltimos, botdan oching.");
      setStatus("error");
      return;
    }

    tg.ready();
    tg.expand();

    const initData = tg.initData;
    if (!initData) {
      setErrorMsg("initData yo'q. Iltimos, botdan oching.");
      setStatus("error");
      return;
    }

    fetch("/api/auth/webapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          router.replace("/dashboard");
        } else {
          setErrorMsg(data.error ?? "Autentifikatsiya xatosi.");
          setStatus("error");
        }
      })
      .catch(() => {
        setErrorMsg("Server bilan aloqa yo'q.");
        setStatus("error");
      });
  }, [router]);

  return (
    <>
      <div
        className="flex flex-col items-center justify-center min-h-screen gap-4"
        style={{ background: "#070B14" }}
      >
        {status === "loading" ? (
          <>
            <div
              className="w-12 h-12 rounded-full"
              style={{
                background: "conic-gradient(from 0deg, #6366F1, #8B5CF6, #A78BFA, #6366F1)",
                animation: "spin 1.5s linear infinite",
                padding: 3,
              }}
            >
              <div className="w-full h-full rounded-full" style={{ background: "#070B14" }} />
            </div>
            <p className="text-sm" style={{ color: "#64748B" }}>
              Yuklanmoqda...
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-center px-6" style={{ color: "#F87171" }}>
              {errorMsg}
            </p>
            <p className="text-xs" style={{ color: "#475569" }}>
              @billz_insight_bot orqali boshlang
            </p>
          </>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  );
}
