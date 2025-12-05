import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://172.20.10.2:3000";

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function readJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { message: text };
  }
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${API_URL}${path}`;
  console.log("[apiFetch]", options.method || "GET", url);

  const token = await AsyncStorage.getItem("token");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const data = await readJsonSafe(res);
    console.log("[apiFetch]", res.status, data);

    if (!res.ok) throw new ApiError(res.status, data?.message || `HTTP ${res.status}`, data);
    return data;
  } finally {
    clearTimeout(timer);
  }
}
