// types/driver.ts
export type Address = {
    id: number | string;
    city: string;
    street: string;
    house_number: string | null;
    apartment: string | null;
    entrance: string | null;
    floor: string | null;
    comment: string | null;
  };
  
  export type Shop = {
    id: number | string;
    name: string | null;
    city: string;
    street: string;
    phone: string | null;
    email: string | null;
  };
  
  export type ProductVariantBrief = {
    id: number | string;
    sku: string | null;
    price: number | string | null;
    product?: { name: string | null } | null;
    material?: { name: string | null } | null;
  };
  
  export type OrderItem = {
    id: number | string;
    quantity: number;
    is_from_shop_stock: boolean;
    product_variant_id: number | string;
    productVariant: ProductVariantBrief | null;
  };
  
  export type DriverOrder = {
    id: number | string;
    created_at: string;
    status: string;
    delivery_type: string;
    customer_name: string | null;
    customer_phone: string | null;
    total_amount: number | string;
    address: Address | null;
    shop: Shop | null;
    items: OrderItem[];
  };
  
  export type ShipmentOrder = {
    id: number | string;
    shipment_id: number | string;
    order_id: number | string;
    order: DriverOrder;
  };
  
  export type Shipment = {
    id: number | string;
    driver_id: number | string;
    planned_at: string;
    status: "in_transit" | "delivered" | "cancelled" | string;
    route_hint: string | null;
    started_at: string;
    finished_at: string | null;
    comment: string | null;
    orders: ShipmentOrder[];
  };
  
  export type ApiResponse<T> = {
    data?: T;
    message?: string;
    error?: string;
  };
  
  // Вспомогательные функции
  export const formatMoney = (v: any): string => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return n.toFixed(2);
  };
  
  export const formatOrderStatus = (s: string): string => {
    switch (s) {
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
  
  export const formatShipmentStatus = (s: string): string => {
    switch (s) {
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
  
  export const formatDeliveryType = (t: string): string => {
    if (t === "pickup") return "Самовывоз";
    if (t === "home_delivery") return "Доставка";
    return t || "—";
  };
  
  export const formatAddress = (order: DriverOrder): string => {
    if (order.delivery_type === "home_delivery" && order.address) {
      const parts = [
        order.address.city,
        order.address.street,
        order.address.house_number && `д. ${order.address.house_number}`,
        order.address.apartment && `кв. ${order.address.apartment}`,
        order.address.entrance && `подъезд ${order.address.entrance}`,
        order.address.floor && `этаж ${order.address.floor}`,
      ].filter(Boolean);
      return parts.join(", ");
    }
    
    if (order.delivery_type === "pickup" && order.shop) {
      const parts = [
        order.shop.city,
        order.shop.street,
        order.shop.name && `(${order.shop.name})`
      ].filter(Boolean);
      return parts.join(", ");
    }
    
    return "—";
  };
  
  export const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };