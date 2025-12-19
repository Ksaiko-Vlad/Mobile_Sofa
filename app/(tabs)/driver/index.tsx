// app/driver/index.tsx
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DriverOrder,
  formatAddress,
  formatDeliveryType,
  formatMoney,
  formatOrderStatus,
} from '../../types/driver';

export default function DriverOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DriverOrder | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [routeHint, setRouteHint] = useState('');
  const [comment, setComment] = useState('');
  const [takingOrder, setTakingOrder] = useState(false);

  const loadOrders = async (showRefresh = false) => {
    try {
      if (!showRefresh) setLoading(true);
      else setRefreshing(true);
      
      setError(null);
      
      const data = await apiFetch("/api/v1/driver/orders", {
        method: "GET",
      });
      
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (e: any) {
      const errorMessage = e?.message || "Ошибка загрузки заказов";
      setError(errorMessage);
      Alert.alert("Ошибка", errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleTakeOrder = async () => {
    if (!selectedOrder) return;

    try {
      setTakingOrder(true);
      
      const response = await apiFetch("/api/v1/driver/orders", {
        method: "POST",
        body: JSON.stringify({
          orderId: Number(selectedOrder.id),
          routeHint: routeHint.trim() || null,
          comment: comment.trim() || null,
        }),
      });

      Alert.alert(
        "Успешно", 
        `Заказ ${selectedOrder.id} взят в доставку.\nShipment ID: ${response.shipmentId || 'N/A'}`
      );
      
      setModalVisible(false);
      setSelectedOrder(null);
      setRouteHint('');
      setComment('');
      await loadOrders();
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message || "Не удалось принять заказ");
    } finally {
      setTakingOrder(false);
    }
  };

  const openModal = (order: DriverOrder) => {
    setSelectedOrder(order);
    setRouteHint('');
    setComment('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedOrder(null);
    setRouteHint('');
    setComment('');
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Загрузка заказов...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ожидают</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => loadOrders(true)}
            disabled={refreshing}
          >
            <IconSymbol name="arrow.clockwise" size={20} color="black" />
          </TouchableOpacity>
          
          {/* Кнопка перехода к активным доставкам */}
          <Link href="/driver/active" asChild>
            <TouchableOpacity style={styles.activeButton}>
              <IconSymbol name="clock.fill" size={20} color="black" />
              <Text style={styles.activeButtonText}>Активные</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {error && !refreshing && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => loadOrders()}
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
            onRefresh={() => loadOrders(true)}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        {orders.length === 0 && !refreshing ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Нет доступных заказов для доставки</Text>
          </View>
        ) : (
          orders.map((order) => (
            <View key={String(order.id)} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderId}>Заказ {order.id}</Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.created_at).toLocaleDateString('ru-RU')}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  order.status === "ready_to_ship" && styles.statusReady
                ]}>
                  <Text style={styles.statusText}>
                    {formatOrderStatus(order.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.orderBody}>
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Клиент</Text>
                  <Text style={styles.infoText}>
                    {order.customer_name || "—"}
                  </Text>
                  {order.customer_phone && (
                    <Text style={styles.phoneText}>Номер: {order.customer_phone}</Text>
                  )}
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Адрес доставки</Text>
                  <Text style={styles.infoText}>{formatAddress(order)}</Text>
                  {order.address?.comment && (
                    <Text style={styles.commentText}>{order.address.comment}</Text>
                  )}
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Информация</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Тип доставки:</Text>
                    <Text style={styles.infoValue}>
                      {formatDeliveryType(order.delivery_type)}
                    </Text>
                  </View>
                  {order.delivery_type === "pickup" && order.shop && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Магазин:</Text>
                      <Text style={styles.infoValue}>
                        {order.shop.name || `#${order.shop.id}`}
                      </Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Сумма:</Text>
                    <Text style={styles.totalAmount}>
                      {formatMoney(order.total_amount)} BYN
                    </Text>
                  </View>
                </View>

                {order.items.length > 0 && (
                  <View style={styles.itemsSection}>
                    <Text style={styles.sectionTitle}>
                      Товары ({order.items.length})
                    </Text>
                    {order.items.slice(0, 3).map((item) => {
                      const pv = item.productVariant;
                      const name = pv?.product?.name ?? "Без названия";
                      const material = pv?.material?.name ? ` (${pv.material.name})` : '';
                      
                      return (
                        <View key={String(item.id)} style={styles.itemPreview}>
                          <Text style={styles.itemName} numberOfLines={1}>
                            {name}{material}
                          </Text>
                          <View style={styles.itemMeta}>
                            <Text style={styles.itemQuantity}>
                              {item.quantity} шт.
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
                        </View>
                      );
                    })}
                    {order.items.length > 3 && (
                      <Text style={styles.moreItemsText}>
                        ...и ещё {order.items.length - 3} товаров
                      </Text>
                    )}
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.takeOrderButton,
                  takingOrder && styles.takeOrderButtonDisabled
                ]}
                onPress={() => openModal(order)}
                disabled={takingOrder}
              >
                <Text style={styles.takeOrderButtonText}>
                  {takingOrder ? "Принимаем..." : "Принять заказ"}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Модальное окно принятия заказа */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Принять заказ {selectedOrder?.id}
              </Text>
              <TouchableOpacity 
                onPress={closeModal}
                disabled={takingOrder}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.modalInfo}>
                <Text style={styles.modalInfoText}>
                  <Text style={styles.modalInfoLabel}>Клиент:</Text>{' '}
                  {selectedOrder?.customer_name || "—"}
                </Text>
                <Text style={styles.modalInfoText}>
                  <Text style={styles.modalInfoLabel}>Номер телефона:</Text>{' '}
                  {selectedOrder?.customer_phone || "—"}
                </Text>
                <Text style={styles.modalInfoText}>
                  <Text style={styles.modalInfoLabel}>Адрес:</Text>{' '}
                  {selectedOrder ? formatAddress(selectedOrder) : "—"}
                </Text>
                <Text style={styles.modalInfoText}>
                  <Text style={styles.modalInfoLabel}>Тип доставки:</Text>{' '}
                  {selectedOrder ? formatDeliveryType(selectedOrder.delivery_type) : "—"}
                </Text>
                <Text style={styles.modalInfoText}>
                  <Text style={styles.modalInfoLabel}>Сумма:</Text>{' '}
                  {selectedOrder ? formatMoney(selectedOrder.total_amount) : "0.00"} BYN
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  Маршрут
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={routeHint}
                  onChangeText={setRouteHint}
                  placeholder="Например: Минск-Брест-Гомель"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  editable={!takingOrder}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  Комментарии водителя (необязательно)
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Дополнительная информация по доставке"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  editable={!takingOrder}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeModal}
                disabled={takingOrder}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.confirmButton,
                  takingOrder && styles.confirmButtonDisabled
                ]}
                onPress={handleTakeOrder}
                disabled={takingOrder}
              >
                <Text style={styles.confirmButtonText}>
                  {takingOrder ? "Принимаем..." : "Принять заказ"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  activeButton: {
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
  activeButtonText: {
    color: '#black',
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
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
  },
  orderCard: {
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  orderId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 13,
    color: '#6c757d',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
  },
  statusReady: {
    backgroundColor: '#40c057',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderBody: {
    padding: 16,
  },
  infoSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 15,
    color: '#212529',
    lineHeight: 22,
  },
  phoneText: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  commentText: {
    fontSize: 13,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 4,
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6c757d',
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
  itemsSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
  },
  itemPreview: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
    marginBottom: 6,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 13,
    color: '#6c757d',
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
    backgroundColor: '#A9A9A9',
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  moreItemsText: {
    fontSize: 13,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  takeOrderButton: {
    margin: 16,
    marginTop: 0,
    paddingVertical: 16,
    backgroundColor: '#228B22',
    borderRadius: 12,
    alignItems: 'center',
  },
  takeOrderButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  takeOrderButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    flex: 1,
    marginRight: 12,
  },
  modalClose: {
    fontSize: 28,
    color: '#6c757d',
    paddingHorizontal: 4,
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  modalInfo: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  modalInfoText: {
    fontSize: 15,
    color: '#212529',
    marginBottom: 8,
    lineHeight: 22,
  },
  modalInfoLabel: {
    fontWeight: '600',
    color: '#495057',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    color: '#495057',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#212529',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    color: '#495057',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#228B22',
  },
  confirmButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});