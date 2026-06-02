// 轻量 localStorage 封装：统一 JSON 序列化与容错。
export const storage = {
  get<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  },

  set(key: string, value: unknown): void {
    const raw = typeof value === "string" ? value : JSON.stringify(value);
    localStorage.setItem(key, raw);
  },

  remove(key: string): void {
    localStorage.removeItem(key);
  },
};
