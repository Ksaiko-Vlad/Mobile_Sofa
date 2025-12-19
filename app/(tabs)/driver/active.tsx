// app/driver/active.tsx
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Shipment,
  formatAddress,
  formatDateTime,
  formatDeliveryType,
  formatMoney,
  formatShipmentStatus,
} from '../../types/driver';

export default function ActiveShipmentsPage() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);
  const [expandedShipments, setExpandedShipments] = useState<Record<string, boolean>>({});
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const loadShipments = async (showRefresh = false) => {
    try {
      if (!showRefresh) setLoading(true);
      else setRefreshing(true);

      setError(null);

      const data = await apiFetch("/api/v1/driver/active", {
        method: "GET",
      });

      setShipments(Array.isArray(data.shipments) ? data.shipments : []);
    } catch (e: any) {
      const errorMessage = e?.message || "Ошибка загрузки активных доставок";
      setError(errorMessage);
      Alert.alert("Ошибка", errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  const updateShipmentStatus = async (shipmentId: number | string, action: "deliver" | "cancel") => {
    try {
      setUpdatingId(shipmentId);

      const response = await apiFetch("/api/v1/driver/active", {
        method: "POST",
        body: JSON.stringify({
          shipmentId: Number(shipmentId),
          action
        }),
      });

      Alert.alert(
        action === "deliver" ? "Успешно" : "Отменено",
        response.message || `Доставка ${shipmentId} обновлена`
      );

      await loadShipments();
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message || "Не удалось обновить статус доставки");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleShipmentExpanded = (shipmentId: string) => {
    setExpandedShipments(prev => ({
      ...prev,
      [shipmentId]: !prev[shipmentId]
    }));
  };

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_transit': return 'white';
      case 'delivered': return '#4CAF50';
      case 'cancelled': return '#f44336';
      default: return '#6c757d';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'in_transit': return 'black';
      case 'delivered': return '#e8f5e9';
      case 'cancelled': return '#ffebee';
      default: return '#f8f9fa';
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Загрузка активных доставок...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>В процессе</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => loadShipments(true)}
            disabled={refreshing}
          >
            <IconSymbol name="arrow.clockwise" size={20} color="black" />
          </TouchableOpacity>

          {/* Кнопка перехода к списку заказов */}
          <Link href="/driver" asChild>
            <TouchableOpacity style={styles.ordersButton}>
              <IconSymbol name="list.bullet" size={20} color="black" />
              <Text style={styles.ordersButtonText}>Заказы</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {error && !refreshing && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadShipments()}
            disabled={refreshing}
          >
            <Text style={styles.retryButtonText}>Попробовать снова</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadShipments(true)}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        {shipments.length === 0 && !refreshing ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Нет активных доставок</Text>
            <Text style={styles.emptySubtext}>
              Все заказы доставлены или вы ещё не приняли ни одного заказа
            </Text>
          </View>
        ) : (
          shipments.map((shipment) => {
            const shipmentId = String(shipment.id);
            const isShipmentExpanded = expandedShipments[shipmentId];
            const orders = Array.isArray(shipment.orders) ? shipment.orders : [];
            const statusColor = getStatusColor(shipment.status);
            const statusBgColor = getStatusBgColor(shipment.status);

            return (
              <View key={shipmentId} style={styles.shipmentCard}>
                <TouchableOpacity
                  style={styles.shipmentHeader}
                  onPress={() => toggleShipmentExpanded(shipmentId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.shipmentTitleRow}>
                    <View>
                      <Text style={styles.shipmentId}>Доставка {shipmentId}</Text>
                      <Text style={styles.shipmentDates}>
                        Начало: {formatDateTime(shipment.started_at)}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {formatShipmentStatus(shipment.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.shipmentMeta}>
                    <Text style={styles.metaText}>
                      Запланировано: {formatDateTime(shipment.planned_at)}
                    </Text>
                    {shipment.route_hint && (
                      <Text style={styles.routeHint} numberOfLines={2}>
                        Маршрут: {shipment.route_hint}
                      </Text>
                    )}
                  </View>

                  <View style={styles.footerRow}>
                    <Text style={styles.ordersCount}>
                      Заказов: {orders.length}
                    </Text>
                    <Text style={styles.expandIndicator}>
                      {isShipmentExpanded ? '▲' : '▼'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {isShipmentExpanded && (
                  <View style={styles.shipmentContent}>
                    {orders.map((shipmentOrder) => {
                      const order = shipmentOrder.order;
                      const orderId = String(order.id);
                      const isOrderExpanded = expandedOrders[orderId];
                      const items = Array.isArray(order.items) ? order.items : [];

                      return (
                        <View key={orderId} style={styles.orderCard}>
                          <TouchableOpacity
                            onPress={() => toggleOrderExpanded(orderId)}
                            style={styles.orderHeader}
                            activeOpacity={0.7}
                          >
                            <View>
                              <Text style={styles.orderId}>
                                Заказ {orderId}
                              </Text>
                              <Text style={styles.orderCustomer}>
                                Клиент: {order.customer_name || '—'}  {order.customer_phone || '—'}
                              </Text>
                            </View>
                            <Text style={styles.expandIcon}>
                              {isOrderExpanded ? '▲' : '▼'}
                            </Text>
                          </TouchableOpacity>

                          <View style={styles.orderInfo}>
                            <View style={styles.infoGrid}>
                              <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Тип доставки</Text>
                                <Text style={styles.infoValue}>
                                  {formatDeliveryType(order.delivery_type)}
                                </Text>
                              </View>
                              <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Создан</Text>
                                <Text style={styles.infoValue}>
                                  {formatDateTime(order.created_at)}
                                </Text>
                              </View>
                              <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Сумма</Text>
                                <Text style={styles.totalAmount}>
                                  {formatMoney(order.total_amount)} BYN
                                </Text>
                              </View>
                            </View>

                            <Text style={styles.addressLabel}> Адрес</Text>
                            <Text style={styles.addressText}>
                              {formatAddress(order)}
                            </Text>

                            {order.address?.comment && (
                              <Text style={styles.commentText}>
                                💬 {order.address.comment}
                              </Text>
                            )}

                            {order.delivery_type === "pickup" && order.shop && (
                              <Text style={styles.shopInfo}>
                                🏪 Магазин: {order.shop.name || `#${order.shop.id}`}
                              </Text>
                            )}
                          </View>

                          {isOrderExpanded && items.length > 0 && (
                            <View style={styles.itemsContainer}>
                              <Text style={styles.itemsTitle}>
                                🛒 Товары ({items.length})
                              </Text>
                              {items.map((item) => {
                                const pv = item.productVariant;
                                const name = pv?.product?.name ?? "Без названия";
                                const material = pv?.material?.name ? ` (${pv.material.name})` : '';
                                const sku = pv?.sku ?? "—";

                                return (
                                  <View key={String(item.id)} style={styles.itemCard}>
                                    <View style={styles.itemHeader}>
                                      <Text style={styles.itemName} numberOfLines={2}>
                                        {name}{material}
                                      </Text>
                                      <View style={[
                                        styles.stockBadge,
                                        item.is_from_shop_stock
                                          ? styles.stockBadgeInStock
                                          : styles.stockBadgeCustom
                                      ]}>
                                        <Text style={styles.stockBadgeText}>
                                          {item.is_from_shop_stock ? "Со склада" : "Под заказ"}
                                        </Text>
                                      </View>
                                    </View>

                                    <View style={styles.itemDetails}>
                                      <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>SKU:</Text>
                                        <Text style={styles.detailValue}>{sku}</Text>
                                      </View>
                                      <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Количество:</Text>
                                        <Text style={styles.detailValue}>{item.quantity} шт.</Text>
                                      </View>
                                      <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Цена:</Text>
                                        <Text style={styles.detailValue}>
                                          {formatMoney(pv?.price)} BYN
                                        </Text>
                                      </View>
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {shipment.status === "in_transit" && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deliverButton]}
                      onPress={() => updateShipmentStatus(shipmentId, "deliver")}
                      disabled={updatingId === shipmentId}
                    >
                      <Text style={styles.actionButtonText}>
                        {updatingId === shipmentId ? "Обновляем..." : " Доставлено"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => updateShipmentStatus(shipmentId, "cancel")}
                      disabled={updatingId === shipmentId}
                    >
                      <Text style={styles.actionButtonText}>
                        {updatingId === shipmentId ? "Обновляем..." : " Отменить"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  ordersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 6,
  },
  ordersButtonText: {
    color: 'black',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 18,
    color: '#495057',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
  shipmentCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  shipmentHeader: {
    padding: 16,
  },
  shipmentTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shipmentId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  shipmentDates: {
    fontSize: 13,
    color: '#6c757d',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  shipmentMeta: {
    marginBottom: 12,
  },
  metaText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  routeHint: {
    fontSize: 13,
    color: 'black',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
  },
  ordersCount: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  expandIndicator: {
    fontSize: 14,
    color: 'black',
    fontWeight: '600',
  },
  shipmentContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
  },
  orderCard: {
    marginTop: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    overflow: 'hidden',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f1f3f5',
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  orderCustomer: {
    fontSize: 13,
    color: '#6c757d',
  },
  expandIcon: {
    fontSize: 14,
    color: 'black',
    fontWeight: '600',
  },
  orderInfo: {
    padding: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 12,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 16,
    color: '#212529',
    fontWeight: '700',
  },
  addressLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 14,
    color: '#212529',
    lineHeight: 20,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  commentText: {
    fontSize: 13,
    color: '#6c757d',
    fontStyle: 'italic',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 8,
  },
  shopInfo: {
    fontSize: 13,
    color: '#495057',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  itemsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    padding: 16,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockBadgeInStock: {
    backgroundColor: '#e3f2fd',
  },
  stockBadgeCustom: {
    backgroundColor: '#f3e5f5',
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#495057',
  },
  itemDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  detailValue: {
    fontSize: 13,
    color: '#212529',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  deliverButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});