import { apiFetch } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

type Role = "customer" | "manager" | "driver" | "factory_worker" | "admin";

export type AuthUser = {
  id: string | number;
  role: Role;
  email?: string;
  phone?: string | null;

  first_name?: string | null;
  second_name?: string | null;
  last_name?: string | null;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  phone: string;
  first_name?: string;
  second_name?: string;
  last_name?: string;
};

const TOKEN_KEY = "token";
const USER_KEY = "user";

async function readStored<T>(key: string): Promise<T | null> {
  const v = await AsyncStorage.getItem(key);
  return v ? (JSON.parse(v) as T) : null;
}

export function useAuth() {
  const [hydrating, setHydrating] = useState(true);
  const [loading, setLoading] = useState(false);

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  // восстановление с диска при старте
  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          readStored<AuthUser>(USER_KEY),
        ]);
        setToken(t);
        setUser(u);
      } finally {
        setHydrating(false);
      }
    })();
  }, []);

  async function persist(auth: AuthResponse) {
    setToken(auth.token);
    setUser(auth.user);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, auth.token),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(auth.user)),
    ]);
    return auth;
  }

  async function login(email: string, password: string, phone: string): Promise<AuthResponse> {
    setLoading(true);
    try {
      
      const data = await apiFetch("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, phone }),
      });
      return await persist(data as AuthResponse);
    } finally {
      setLoading(false);
    }
  }

  async function register(payload: RegisterPayload): Promise<AuthResponse> {
    setLoading(true);
    try {
      const data = await apiFetch("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return await persist(data as AuthResponse);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      setToken(null);
      setUser(null);
      await Promise.all([
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);
    } finally {
      setLoading(false);
    }
  }

  return {
    token,
    user,
    hydrating,
    loading,
    login,
    register,
    logout,
    setUser,
  };
}
