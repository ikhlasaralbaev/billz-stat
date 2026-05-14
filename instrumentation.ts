export async function register() {
  // Only run in Node.js runtime (not Edge), and only when a URL is configured
  // (i.e., in production on Railway — not during build or in serverless environments)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.NEXT_PUBLIC_APP_URL) return;

  const { default: cron } = await import("node-cron");

  // Run every hour at :00 — mirrors the previous Vercel cron schedule
  cron.schedule("0 * * * *", async () => {
    try {
      const url = process.env.NEXT_PUBLIC_APP_URL!;
      const secret = process.env.CRON_SECRET;
      if (!secret) {
        console.error("[cron] CRON_SECRET not set, skipping");
        return;
      }
      const res = await fetch(`${url}/api/cron/daily-report`, {
        headers: { "x-cron-secret": secret },
      });
      const data = await res.json();
      console.log("[cron] daily-report result:", JSON.stringify(data));
    } catch (err) {
      console.error("[cron] daily-report failed:", err);
    }
  });

  console.log("[cron] scheduler started");
}
