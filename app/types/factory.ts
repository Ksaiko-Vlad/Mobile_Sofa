export type Shop = {
    id: number | string;
    city: string;
    street: string;
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
  
  export type FactoryOrder = {
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
  
  export type ApiResponse = {
    available: FactoryOrder[];
    mine: FactoryOrder[];
    message?: string;
  };

  export default {};