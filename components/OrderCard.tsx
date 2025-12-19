import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Shop = {
  id: number | string;
  city: string;
  street: string;
};

type ProductVariantBrief = {
  id: number | string;
  sku: string | null;
  price: number | string | null;
  product?: { name: string | null } | null;
  material?: { name: string | null } | null;
};

type OrderItem = {
  id: number | string;
  quantity: number;
  is_from_shop_stock: boolean;
  product_variant_id: number | string;
  productVariant: ProductVariantBrief | null;
};

type FactoryOrder = {
  id: number | string;
  created_at: string;
  status: "created" | "in_production" | "ready_to_ship" | "in_transit" | "delivered" | "cancelled" | string;
  delivery_type: string;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number | string;
  shop?: Shop | null;
  factory_worker_id?: number | string | null;
  items?: OrderItem[];
};

type OrderCardProps = {
  order: FactoryOrder;
  activeTab: "available" | "mine";
  processing: boolean;
  onAction: (orderId: number | string, action: "take" | "mark_ready") => void;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatStatus = (s: string) => {
  switch (s) {
    case "created":
      return "Создан";
    case "in_production":
      return "В производстве";
    case "ready_to_ship":
      return "Готов к отгрузке";
    case "in_transit":
      return "В пути";
    case "delivered":
      return "Доставлен";
    case "cancelled":
      return "Отменён";
    default:
      return s;
  }
};

const formatDeliveryType = (t: string) => {
  if (t === "pickup") return "Самовывоз";
  if (t === "home_delivery") return "Доставка";
  return t || "—";
};

const money = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(2);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "created":
      return "silver"; //серый
    case "in_production":
      return "#2196F3"; // синий
    case "ready_to_ship":
      return "#4CAF50"; // зеленый
    case "cancelled":
      return "#F44336"; // красный
    default:
      return "#9E9E9E"; 
  }
};

export default function OrderCard({
  order,
  activeTab,
  processing,
  onAction,
}: OrderCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getActionInfo = () => {
    if (activeTab === "available" && order.status === "created") {
      return {
        label: "Взять в производство",
        action: "take" as const,
        color: "black",
      };
    } else if (activeTab === "mine" && order.status === "in_production") {
      return {
        label: "Отметить готовым",
        action: "mark_ready" as const,
        color: "#228B22",
      };
    }
    return null;
  };

  const actionInfo = getActionInfo();
  const statusColor = getStatusColor(order.status);
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <View style={styles.card}>
      {/* Заголовок карточки */}
      <TouchableOpacity onPress={() => setExpanded(!expanded)}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.orderNumber}>Заказ {order.id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{formatStatus(order.status)}</Text>
            </View>
          </View>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#666"
          />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{formatDate(order.created_at)}</Text>
          </View>
          
          <View style={styles.row}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {order.customer_name || "—"}  {order.customer_phone || "—"}
            </Text>
          </View>
          
          {order.shop && (
            <View style={styles.row}>
              <Ionicons name="storefront-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                {order.shop.city}, {order.shop.street}
              </Text>
            </View>
          )}
          
          <View style={styles.row}>
            <Ionicons name="car-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{formatDeliveryType(order.delivery_type)}</Text>
          </View>
          
          <View style={styles.row}>
            <Ionicons name="cash-outline" size={16} color="#666" />
            <Text style={styles.totalAmount}>{money(order.total_amount)} BYN</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Детали заказа (раскрывающаяся часть) */}
      {expanded && items.length > 0 && (
        <View style={styles.expandedContent}>
          <Text style={styles.itemsTitle}>Товары ({items.length}):</Text>
          
          {items.map((item) => {
            const pv = item.productVariant;
            const name = pv?.product?.name || "Без названия";
            const material = pv?.material?.name || "";
            const sku = pv?.sku || "—";
            const price = pv?.price ? money(pv.price) : "—";

            return (
              <View key={String(item.id)} style={styles.itemCard}>
                <Text style={styles.itemName}>{name}</Text>
                
                {material && (
                  <Text style={styles.itemMaterial}>Материал: {material}</Text>
                )}
                
                <View style={styles.itemDetails}>
                  <Text style={styles.itemDetail}>SKU: {sku}</Text>
                  <Text style={styles.itemDetail}>Количество: {item.quantity}</Text>
                  <Text style={styles.itemDetail}>Цена: {price} BYN</Text>
                </View>
                
                <View style={[
                  styles.stockBadge,
                  item.is_from_shop_stock ? styles.stockBadgeShop : styles.stockBadgeCustom
                ]}>
                  <Text style={styles.stockBadgeText}>
                    {item.is_from_shop_stock ? "С магазина" : "Под заказ"}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Кнопка действия */}
      {actionInfo && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: actionInfo.color }]}
          onPress={() => onAction(order.id, actionInfo.action)}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.actionButtonText}>{actionInfo.label}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  cardBody: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  itemMaterial: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
  },
  itemDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  itemDetail: {
    fontSize: 12,
    color: "#666",
  },
  stockBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stockBadgeShop: {
    backgroundColor: "#E8F5E9",
  },
  stockBadgeCustom: {
    backgroundColor: "#E3F2FD",
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#333",
  },
  actionButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});