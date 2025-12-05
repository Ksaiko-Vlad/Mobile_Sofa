import { apiFetch } from "@/lib/api";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    Text,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type Order = {
  id: string;
  created_at: string;
  status: string;
  delivery_type: string;
  total_amount: number | string;
  customer_name?: string | null;
  customer_phone?: string | null;
};

export default function ManagerOrdersList() {
  const insets = useSafeAreaInsets();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setErr(null);
      const data = await apiFetch("/api/v1/manager/orders");
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка загрузки заказов");
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          <Pressable
            onPress={() => router.push("/(tabs)/manager/create" as any)}
            style={{
              backgroundColor: "#111",
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              marginRight: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>+ Новый заказ</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setRefreshing(true);
              load();
            }}
            style={{
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.15)",
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontWeight: "700" }}>Обновить</Text>
          </Pressable>
        </View>

        {err && <Text style={{ color: "crimson", marginBottom: 10 }}>{err}</Text>}
        {orders.length === 0 && <Text style={{ opacity: 0.7 }}>Пока нет заказов</Text>}

        <FlatList
          data={orders}
          keyExtractor={(o) => String(o.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => (
            <View
              style={{
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.08)",
                borderRadius: 16,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "800" }}>Заказ #{String(item.id)}</Text>
              <Text style={{ opacity: 0.75, marginTop: 4 }}>
                {new Date(item.created_at).toLocaleString()} • {item.delivery_type} • {item.status}
              </Text>
              <Text style={{ marginTop: 6, fontWeight: "700" }}>
                Итого: {String(item.total_amount)} BYN
              </Text>
              <Text style={{ marginTop: 6, opacity: 0.85 }}>
                Клиент: {item.customer_name ?? "—"} • {item.customer_phone ?? "—"}
              </Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
