import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import OrderCard from "../../../components/OrderCard";
import { ApiResponse, FactoryOrder } from "../../types/factory";

export default function FactoryWorkerScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"available" | "mine">("available");
  const [availableOrders, setAvailableOrders] = useState<FactoryOrder[]>([]);
  const [myOrders, setMyOrders] = useState<FactoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingOrder, setProcessingOrder] = useState<string | number | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      const data = await apiFetch("/api/v1/factory/orders") as ApiResponse;
      
      setAvailableOrders(Array.isArray(data.available) ? data.available : []);
      setMyOrders(Array.isArray(data.mine) ? data.mine : []);
    } catch (e: any) {
      console.error("Error loading orders:", e);
      setError(e?.message || "Ошибка загрузки заказов");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, [loadOrders]);

  const handleAction = async (orderId: number | string, action: "take" | "mark_ready") => {
    try {
      setProcessingOrder(orderId);
      
      await apiFetch("/api/v1/factory/orders", {
        method: "POST",
        body: JSON.stringify({ 
          orderId: Number(orderId), 
          action 
        }),
      });

      await loadOrders();
      
    } catch (e: any) {
      console.error("Error processing order:", e);
      setError(e?.message || "Ошибка выполнения действия");
    } finally {
      setProcessingOrder(null);
    }
  };

  const currentOrders = activeTab === "available" ? availableOrders : myOrders;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Загрузка заказов...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Производство</Text>
        <View style={styles.stats}>
          <Text style={styles.statText}>
            Новые: <Text style={styles.statNumber}>{availableOrders.length}</Text>
          </Text>
          <Text style={styles.statText}>
            Мои: <Text style={styles.statNumber}>{myOrders.length}</Text>
          </Text>
        </View>
      </View>

      {/* Табы */}
      <View style={styles.tabContainer}>
        <View style={styles.tabButtons}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "available" && styles.tabButtonActive
            ]}
            onPress={() => setActiveTab("available")}
          >
            <Text style={[
              styles.tabButtonText,
              activeTab === "available" && styles.tabButtonTextActive
            ]}>
              Новые ({availableOrders.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "mine" && styles.tabButtonActive
            ]}
            onPress={() => setActiveTab("mine")}
          >
            <Text style={[
              styles.tabButtonText,
              activeTab === "mine" && styles.tabButtonTextActive
            ]}>
              Мои ({myOrders.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {currentOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === "available" 
                ? "Нет новых заказов для производства" 
                : "У вас нет активных заказов"}
            </Text>
          </View>
        ) : (
          currentOrders.map((order) => (
            <OrderCard
              key={String(order.id)}
              order={order}
              activeTab={activeTab}
              processing={processingOrder === order.id}
              onAction={handleAction}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statText: {
    fontSize: 16,
    color: "#666",
  },
  statNumber: {
    fontWeight: "bold",
    color: "black",
  },
  tabContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabButtons: {
    flexDirection: "row",
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 20,
  },
  tabButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  tabButtonTextActive: {
    color: "black",
    fontWeight: "bold",
  },
  errorContainer: {
    backgroundColor: "#FFEBEE",
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
});