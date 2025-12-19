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

// --- типы, синхронные с вебом ---

type ProductVariant = {
  id: number | string;
  sku: string | null;
  price?: string | number | null;
};

type OrderItem = {
  id: number | string;
  product_variant_id: number | string;
  unit_price: string | number;
  quantity: number;
  is_from_shop_stock: boolean | number; // на всякий случай поддержим 0/1
  productVariant?: ProductVariant | null;
};

type Order = {
  id: number | string;
  created_at: string;
  status: string;
  delivery_type: "pickup" | "home_delivery" | string;
  total_amount: number | string;
  customer_name?: string | null;
  customer_phone?: string | null;
  items?: OrderItem[];
};

// --- helpers ---

function money(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v ?? "—");
  return n.toFixed(2);
}

function formatDeliveryType(t: string) {
  if (t === "pickup") return "Самовывоз";
  if (t === "home_delivery") return "Доставка";
  return t || "—";
}

function itemTitle(it: OrderItem) {
  const pv = it.productVariant;
  const sku = pv?.sku ? `SKU: ${pv.sku}` : null;
  const vid = it.product_variant_id ? `Вариант #${it.product_variant_id}` : null;
  return sku || vid || "Позиция";
}

export default function ManagerOrdersList() {
  const insets = useSafeAreaInsets();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // какие заказы раскрыты (для списка товаров)
  const [open, setOpen] = useState<Record<string, boolean>>({});

  async function load() {
    try {
      setErr(null);
      const data = await apiFetch("/api/v1/manager/orders");
      const list = Array.isArray(data?.orders) ? (data.orders as Order[]) : [];
      setOrders(list);
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
            <Text style={{ color: "#fff", fontWeight: "700" }}> Новый заказ</Text>
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
          renderItem={({ item }) => {
            const idKey = String(item.id);
            const isOpen = !!open[idKey];
            const items = Array.isArray(item.items) ? item.items : [];

            return (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: "rgba(0,0,0,0.08)",
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "800" }}>
                  Заказ {String(item.id)}
                </Text>

                <Text style={{ opacity: 0.75, marginTop: 4 }}>
                  Дата: {new Date(item.created_at).toLocaleString()}
                </Text>

                <Text style={{ opacity: 0.75, marginTop: 4 }}>
                  Тип: {formatDeliveryType(item.delivery_type)}
                </Text>

                <Text style={{ opacity: 0.75, marginTop: 4 }}>
                  Статус: {item.status}
                </Text>

                <Text style={{ marginTop: 6, opacity: 0.85 }}>
                  Клиент: {item.customer_name ?? "—"}
                </Text>

                <Text style={{ marginTop: 6, opacity: 0.85 }}>
                  Номер: {item.customer_phone ?? "—"}
                </Text>

                <Text style={{ marginTop: 6, fontWeight: "700" }}>
                  Итого: {money(item.total_amount)} BYN
                </Text>

                {items.length > 0 && (
                  <>
                    <Pressable
                      onPress={() =>
                        setOpen((p) => ({ ...p, [idKey]: !p[idKey] }))
                      }
                      style={{
                        marginTop: 10,
                        borderWidth: 1,
                        borderColor: "rgba(0,0,0,0.12)",
                        borderRadius: 10,
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        alignSelf: "flex-start",
                      }}
                    >
                      <Text style={{ fontWeight: "700" }}>
                        {isOpen
                          ? "Скрыть товары"
                          : `Показать товары (${items.length})`}
                      </Text>
                    </Pressable>

                    {isOpen && (
                      <View
                        style={{
                          marginTop: 8,
                          borderTopWidth: 1,
                          borderTopColor: "rgba(0,0,0,0.06)",
                          paddingTop: 8,
                        }}
                      >
                        {items.map((it) => {
                          const fromStock = Boolean(it.is_from_shop_stock);

                          return (
                            <View
                              key={String(it.id)}
                              style={{
                                paddingVertical: 8,
                                borderBottomWidth: 1,
                                borderBottomColor: "rgba(0,0,0,0.04)",
                              }}
                            >
                              <Text style={{ fontWeight: "800" }}>
                                {itemTitle(it)}
                              </Text>

                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  marginTop: 4,
                                }}
                              >
                                <View
                                  style={{
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 999,
                                    backgroundColor: fromStock
                                      ? "rgba(76,175,80,0.15)"
                                      : "rgba(0,0,0,0.06)",
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 12,
                                      fontWeight: "700",
                                      color: fromStock ? "#2e7d32" : "#555",
                                    }}
                                  >
                                    {fromStock ? "С магазина" : "Под заказ"}
                                  </Text>
                                </View>
                              </View>

                              <View
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  marginTop: 4,
                                }}
                              >
                                <Text style={{ fontSize: 13 }}>
                                  Количество:{" "}
                                  <Text style={{ fontWeight: "700" }}>
                                    {it.quantity}
                                  </Text>
                                </Text>
                                <Text style={{ fontSize: 13 }}>
                                  Цена:{" "}
                                  <Text style={{ fontWeight: "700" }}>
                                    {money(it.unit_price)} BYN
                                  </Text>
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </>
                )}
              </View>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}
