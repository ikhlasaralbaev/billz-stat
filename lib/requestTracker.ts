import { AsyncLocalStorage } from "async_hooks";
import axios from "axios";

export interface RequestEntry {
  method: string;
  url: string;
  count: number;
  status: "success" | "error";
}

const storage = new AsyncLocalStorage<Map<string, RequestEntry>>();

function isBillzUrl(url: string): boolean {
  const bases = [
    process.env.BILLZ_API_URL_V1,
    process.env.BILLZ_API_URL_V2,
    process.env.BILLZ_API_URL_V3,
  ];
  return bases.some((b) => b && url.startsWith(b));
}

function baseUrl(url: string): string {
  return url.split("?")[0];
}

let interceptorsInstalled = false;

function installInterceptors() {
  if (interceptorsInstalled) return;
  interceptorsInstalled = true;

  axios.interceptors.request.use((config) => {
    const store = storage.getStore();
    if (!store || !config.url || !isBillzUrl(config.url)) return config;

    const method = (config.method ?? "GET").toUpperCase();
    const url = baseUrl(config.url);
    const key = `${method}::${url}`;
    const existing = store.get(key);
    if (existing) {
      existing.count++;
    } else {
      store.set(key, { method, url, count: 1, status: "success" });
    }
    return config;
  });

  axios.interceptors.response.use(
    (res) => res,
    (err) => {
      const store = storage.getStore();
      if (store && err.config?.url && isBillzUrl(err.config.url)) {
        const method = (err.config.method ?? "GET").toUpperCase();
        const url = baseUrl(err.config.url);
        const key = `${method}::${url}`;
        const existing = store.get(key);
        if (existing) existing.status = "error";
      }
      return Promise.reject(err);
    }
  );
}

export async function runWithTracking<T>(
  fn: () => Promise<T>
): Promise<{ result: T; requests: RequestEntry[] }> {
  installInterceptors();
  const map = new Map<string, RequestEntry>();
  const result = await storage.run(map, fn);
  return { result, requests: Array.from(map.values()) };
}
