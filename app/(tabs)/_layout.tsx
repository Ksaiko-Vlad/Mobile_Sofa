import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

type Role = "customer" | "manager" | "driver" | "factory_worker" | "admin";
type StoredUser = { role?: Role } | null;

function safeJson<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [isFactoryWorker, setIsFactoryWorker] = useState(false);
  const [isDriver, setIsDriver] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [t, uRaw] = await Promise.all([
          AsyncStorage.getItem("token"),
          AsyncStorage.getItem("user"),
        ]);

        const u = safeJson<StoredUser>(uRaw);
        const role = u?.role;

        if (!alive) return;
        setToken(t);
        setIsManager(role === "manager" || role === "admin");
        setIsFactoryWorker(role === "factory_worker" || role === "admin");
        setIsDriver(role === "driver" || role === "admin");
      } finally {
        if (alive) setReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!token) {
    return <Redirect href={"/(auth)/login" as any} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
      }}
    >

      <Tabs.Screen
        name="driver"
        options={{
          title: "Водитель",
          href: isDriver ? undefined : null, // Скрываем если не driver
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="car.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="factory_worker"
        options={{
          title: 'Производство',
          href: isFactoryWorker ? undefined : null, // Скрываем если не factory_worker
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="gearshape.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="manager"
        options={{
          title: "Менеджер",
          href: isManager ? undefined : null, // Скрываем если не manager
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="briefcase.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="account"
        options={{
          title: "Кабинет",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="person.fill" color={color} />
          ),
        }}
      />

    </Tabs>
  );
}