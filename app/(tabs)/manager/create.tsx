import { apiFetch } from "@/lib/api";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type ProductVariant = {
  id: number;
  price: number;
  sku: string;
  active: boolean;
  material: { name: string };
};

type Product = {
  id: number;
  name: string;
  active: boolean;
  variants: ProductVariant[];
};

type Shop = { id: number; city: string; street: string };

type DeliveryType = "pickup" | "home_delivery";

type DraftItem = {
  product_variant_id: number;
  title: string;
  unit_price: number;
  quantity: number;
  is_from_shop_stock: boolean;
};

const toNum = (v: any, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

// ---- VALIDATION HELPERS ----
const trim = (v: unknown) => String(v ?? "").trim();

const normalizePhone = (v: string) => {
  const raw = String(v ?? "");
  const digits = raw.replace(/[^\d]/g, ""); // только цифры

  const startsWith375 = digits.startsWith("375");
  const hasPlus = raw.trim().startsWith("+") || startsWith375;

  const out = (hasPlus ? "+" : "") + digits;

  // строго ограничим 13 символами
  return out.slice(0, 13);
};

const isValidPhone = (v: string) => {
  const p = normalizePhone(v);
  // строго +375XXXXXXXXX (13 символов)
  return /^\+375\d{9}$/.test(p);
};

const isValidEmail = (v: string) => {
  const e = trim(v);
  if (!e) return false; // email обязателен
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
};

const minLen = (v: string, n: number) => trim(v).length >= n;

function normalizeProducts(raw: any): Product[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((p: any) => {
    const productId = toNum(p.id);
    const name = String(p.name ?? "");
    const active = Boolean(p.active ?? true);

    const baseVariant: ProductVariant = {
      id: productId,
      price: toNum(p.base_price ?? p.price ?? 0),
      sku: String(p.sku ?? `SKU-${productId}`),
      active: true,
      material: { name: "Базовый" },
    };

    const variants: ProductVariant[] =
      Array.isArray(p.variants) && p.variants.length > 0
        ? p.variants.map((v: any) => ({
            id: toNum(v.id),
            price: toNum(v.price ?? p.base_price ?? p.price ?? 0),
            sku: String(v.sku ?? ""),
            active: Boolean(v.active ?? true),
            material: { name: String(v.material?.name ?? "Материал") },
          }))
        : [baseVariant];

    return { id: productId, name, active, variants };
  });
}

function normalizeShops(raw: any): Shop[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s: any) => ({
    id: toNum(s.id),
    city: String(s.city ?? ""),
    street: String(s.street ?? ""),
  }));
}

function FieldButton({
  label,
  value,
  onPress,
  disabled,
  invalid,
}: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ opacity: 0.8, marginBottom: 6 }}>{label}</Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={{
          borderWidth: 1,
          borderColor: invalid ? "crimson" : "rgba(0,0,0,0.12)",
          borderRadius: 12,
          padding: 12,
          backgroundColor: disabled ? "rgba(0,0,0,0.05)" : "#fff",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <Text style={{ fontWeight: "800" }}>{value || "Выбрать…"}</Text>
      </Pressable>
    </View>
  );
}

function SelectModal({
  visible,
  title,
  items,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  items: Array<{ id: number; label: string; right?: string }>;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}
      />
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#fff",
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          padding: 14,
          maxHeight: "70%",
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "900", marginBottom: 10 }}>
          {title}
        </Text>

        <ScrollView>
          {items.map((it) => (
            <Pressable
              key={it.id}
              onPress={() => onSelect(it.id)}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: "rgba(0,0,0,0.06)",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "800", flex: 1 }}>{it.label}</Text>
              {it.right ? (
                <Text style={{ opacity: 0.75, marginLeft: 10 }}>{it.right}</Text>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          onPress={onClose}
          style={{
            marginTop: 12,
            borderWidth: 1,
            borderColor: "rgba(0,0,0,0.12)",
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "900" }}>Закрыть</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

export default function ManagerOrderCreate() {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);

  const [deliveryType, setDeliveryType] = useState<DeliveryType>("pickup");
  const [shopId, setShopId] = useState<number | null>(null);

  const [customer, setCustomer] = useState({
    name: "",
    second_name: "",
    last_name: "",
    phone: "",
    email: "",
  });

  const [addr, setAddr] = useState({
    city: "",
    street: "",
    house: "",
    apartment: "",
    entrance: "",
    floor: "",
  });

  const [note, setNote] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);

  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    null
  );

  const [openProduct, setOpenProduct] = useState(false);
  const [openVariant, setOpenVariant] = useState(false);

  // для подсветки: когда показывать красное
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const touch = (key: string) => setTouched((p) => ({ ...p, [key]: true }));

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const [prodsRaw, shopsRaw] = await Promise.all([
          apiFetch("/api/v1/products", { signal: ac.signal } as any),
          apiFetch("/api/v1/shops", { signal: ac.signal } as any).catch(
            () => []
          ),
        ]);

        setProducts(normalizeProducts(prodsRaw));
        setShops(normalizeShops(shopsRaw));
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        Alert.alert("Ошибка", e?.message ?? "Не удалось загрузить данные");
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  const activeProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p.active &&
          Array.isArray(p.variants) &&
          p.variants.some((v) => v.active)
      ),
    [products]
  );

  const selectedProduct = useMemo(
    () => activeProducts.find((p) => p.id === selectedProductId) || null,
    [activeProducts, selectedProductId]
  );

  const activeVariants = useMemo(() => {
    if (!selectedProduct) return [];
    return selectedProduct.variants.filter((v) => v.active);
  }, [selectedProduct]);

  const selectedVariant = useMemo(
    () => activeVariants.find((v) => v.id === selectedVariantId) || null,
    [activeVariants, selectedVariantId]
  );

  function addSelectedVariant() {
    if (!selectedProduct || !selectedVariant) {
      Alert.alert("Ошибка", "Сначала выбери товар и вариант");
      return;
    }

    const variantId = selectedVariant.id;

    setItems((prev) => {
      const idx = prev.findIndex((i) => i.product_variant_id === variantId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          product_variant_id: variantId,
          title: `${selectedProduct.name} • ${
            selectedVariant.material?.name ?? ""
          } • ${selectedVariant.sku}`,
          unit_price: Number(selectedVariant.price ?? 0),
          quantity: 1,
          is_from_shop_stock: false, // по умолчанию "под заказ"
        },
      ];
    });

    setSelectedVariantId(null);
  }

  function setQty(variantId: number, qty: number) {
    const q = Math.max(1, Number(qty) || 1);
    setItems((prev) =>
      prev.map((i) =>
        i.product_variant_id === variantId ? { ...i, quantity: q } : i
      )
    );
  }

  function toggleFromStock(variantId: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.product_variant_id === variantId
          ? { ...i, is_from_shop_stock: !i.is_from_shop_stock }
          : i
      )
    );
  }

  function removeItem(variantId: number) {
    setItems((prev) => prev.filter((i) => i.product_variant_id !== variantId));
  }

  const totalUi = useMemo(
    () => items.reduce((s, i) => s + i.unit_price * i.quantity, 0),
    [items]
  );

  // ---- VALIDATION (errors + invalid fields) ----
  const validation = useMemo(() => {
    const errors: string[] = [];
    const invalid = new Set<string>();

    const name = trim(customer.name);
    const phone = customer.phone;
    const email = customer.email;

    if (!name) {
      errors.push("Имя обязательно");
      invalid.add("name");
    } else if (!minLen(name, 2)) {
      errors.push("Имя: минимум 2 символа");
      invalid.add("name");
    }

    if (!isValidPhone(phone)) {
      errors.push(
        "Телефон: строго +375XXXXXXXXX (13 символов), пример: +375291234567"
      );
      invalid.add("phone");
    }

    if (!trim(email)) {
      errors.push("Email обязателен");
      invalid.add("email");
    } else if (!isValidEmail(email)) {
      errors.push("Email: неверный формат");
      invalid.add("email");
    }

    if (items.length === 0) {
      errors.push("Добавь хотя бы один товар");
    }

    if (deliveryType === "pickup") {
      if (!shopId) {
        errors.push("Выбери магазин для самовывоза");
        invalid.add("shopId");
      }
    } else {
      if (!trim(addr.city)) {
        errors.push("Город обязателен");
        invalid.add("city");
      } else if (!minLen(addr.city, 2)) {
        errors.push("Город: минимум 2 символа");
        invalid.add("city");
      }

      if (!trim(addr.street)) {
        errors.push("Улица обязательна");
        invalid.add("street");
      } else if (!minLen(addr.street, 2)) {
        errors.push("Улица: минимум 2 символа");
        invalid.add("street");
      }

      if (!trim(addr.house)) {
        errors.push("Дом обязателен");
        invalid.add("house");
      }
    }

    return { errors, invalid };
  }, [
    customer.name,
    customer.phone,
    customer.email,
    items.length,
    deliveryType,
    shopId,
    addr.city,
    addr.street,
    addr.house,
  ]);

  const validationErrors = validation.errors;
  const canSubmit = !saving && validationErrors.length === 0;

  const showInvalid = (key: string) =>
    validation.invalid.has(key) && (submitAttempted || touched[key]);

  const inputBase = {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  } as const;

  const inputStyle = (key: string) => ({
    ...inputBase,
    borderColor: showInvalid(key) ? "crimson" : "rgba(0,0,0,0.12)",
  });

  async function submit() {
    setSubmitAttempted(true);

    if (validationErrors.length > 0) {
      Alert.alert("Проверь данные", validationErrors.join("\n"));
      return;
    }

    const payload = {
      customer: {
        name: trim(customer.name),
        second_name: trim(customer.second_name) || undefined,
        last_name: trim(customer.last_name) || undefined,
        phone: normalizePhone(customer.phone),
        email: trim(customer.email),
      },
      delivery: {
        type: deliveryType,
        shopId: deliveryType === "pickup" ? shopId : null,
        address:
          deliveryType === "home_delivery"
            ? {
                city: trim(addr.city),
                street: trim(addr.street),
                house: trim(addr.house),
                apartment: trim(addr.apartment) || null,
                entrance: trim(addr.entrance) || null,
                floor: trim(addr.floor) || null,
              }
            : null,
      },
      note: trim(note) || null,
      items: items.map((i) => ({
        product_variant_id: Number(i.product_variant_id),
        quantity: Number(i.quantity),
        // Явно приводим к boolean, чтобы не было сюрпризов
        is_from_shop_stock: i.is_from_shop_stock === true,
      })),
    };

    setSaving(true);
    try {
      await apiFetch("/api/v1/manager/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      Alert.alert("Ок", "Заказ создан");
      router.replace("/(tabs)/manager" as any);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось создать заказ");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
      >
        <Text style={{ fontSize: 22, fontWeight: "900", marginBottom: 12 }}>
          Новый офлайн-заказ
        </Text>

        <Text style={{ fontWeight: "800", marginTop: 8 }}>Клиент</Text>

        <TextInput
          placeholder="Имя"
          value={customer.name}
          onChangeText={(v) => setCustomer((p) => ({ ...p, name: v }))}
          onBlur={() => touch("name")}
          style={inputStyle("name")}
        />

        <TextInput
          placeholder="Отчество"
          value={customer.second_name}
          onChangeText={(v) => setCustomer((p) => ({ ...p, second_name: v }))}
          onBlur={() => touch("second_name")}
          style={inputStyle("second_name")}
        />

        <TextInput
          placeholder="Фамилия"
          value={customer.last_name}
          onChangeText={(v) => setCustomer((p) => ({ ...p, last_name: v }))}
          onBlur={() => touch("last_name")}
          style={inputStyle("last_name")}
        />

        <TextInput
          placeholder="Телефон"
          value={customer.phone}
          onChangeText={(v) =>
            setCustomer((p) => ({ ...p, phone: normalizePhone(v) }))
          }
          onBlur={() => touch("phone")}
          keyboardType="phone-pad"
          maxLength={13}
          style={inputStyle("phone")}
        />

        <TextInput
          placeholder="Email"
          value={customer.email}
          onChangeText={(v) => setCustomer((p) => ({ ...p, email: v }))}
          onBlur={() => touch("email")}
          autoCapitalize="none"
          keyboardType="email-address"
          style={inputStyle("email")}
        />

        <Text style={{ fontWeight: "800", marginTop: 14 }}>Доставка</Text>

        <View style={{ flexDirection: "row", marginTop: 8 }}>
          <Pressable
            onPress={() => setDeliveryType("pickup")}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              backgroundColor: deliveryType === "pickup" ? "#111" : "transparent",
              marginRight: 10,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: deliveryType === "pickup" ? "#fff" : "#111",
                fontWeight: "800",
              }}
            >
              Самовывоз
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setDeliveryType("home_delivery")}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              backgroundColor:
                deliveryType === "home_delivery" ? "#111" : "transparent",
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: deliveryType === "home_delivery" ? "#fff" : "#111",
                fontWeight: "800",
              }}
            >
              Доставка
            </Text>
          </Pressable>
        </View>

        {deliveryType === "pickup" ? (
          <>
            <Text style={{ marginTop: 8, opacity: 0.8 }}>Магазины:</Text>

            {shops.map((sh) => {
              const isSelected = shopId === sh.id;
              const showShopInvalid = showInvalid("shopId") && !shopId;

              return (
                <Pressable
                  key={sh.id}
                  onPress={() => {
                    setShopId(sh.id);
                    touch("shopId");
                  }}
                  style={{
                    marginTop: 8,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: showShopInvalid
                      ? "crimson"
                      : isSelected
                      ? "#111"
                      : "rgba(0,0,0,0.12)",
                    backgroundColor: isSelected
                      ? "rgba(0,0,0,0.04)"
                      : "transparent",
                  }}
                >
                  <Text style={{ fontWeight: "800" }}>
                    {sh.city}, {sh.street}
                  </Text>
                </Pressable>
              );
            })}
          </>
        ) : (
          <>
            <TextInput
              placeholder="Город"
              value={addr.city}
              onChangeText={(v) => setAddr((p) => ({ ...p, city: v }))}
              onBlur={() => touch("city")}
              style={inputStyle("city")}
            />
            <TextInput
              placeholder="Улица"
              value={addr.street}
              onChangeText={(v) => setAddr((p) => ({ ...p, street: v }))}
              onBlur={() => touch("street")}
              style={inputStyle("street")}
            />
            <TextInput
              placeholder="Дом"
              value={addr.house}
              onChangeText={(v) => setAddr((p) => ({ ...p, house: v }))}
              onBlur={() => touch("house")}
              style={inputStyle("house")}
            />
          </>
        )}

        <TextInput
          placeholder="Комментарий (необязательно)"
          value={note}
          onChangeText={setNote}
          style={{
            borderWidth: 1,
            borderColor: "rgba(0,0,0,0.12)",
            borderRadius: 12,
            padding: 12,
            marginTop: 12,
          }}
        />

        <Text style={{ fontWeight: "800", marginTop: 16 }}>Товары</Text>

        <FieldButton
          label="Товар"
          value={selectedProduct?.name ?? ""}
          onPress={() => setOpenProduct(true)}
        />

        <FieldButton
          label="Вариант"
          value={
            selectedVariant
              ? `${selectedVariant.material?.name ?? ""} • ${
                  selectedVariant.sku
                } • ${selectedVariant.price} BYN`
              : ""
          }
          disabled={!selectedProduct}
          onPress={() => setOpenVariant(true)}
        />

        <Pressable
          onPress={addSelectedVariant}
          disabled={!selectedProduct || !selectedVariant}
          style={{
            marginTop: 12,
            borderWidth: 1,
            borderColor: "rgba(0,0,0,0.15)",
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            opacity: !selectedProduct || !selectedVariant ? 0.5 : 1,
          }}
        >
          <Text style={{ fontWeight: "900" }}>Добавить позицию</Text>
        </Pressable>

        {items.length > 0 && (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.12)",
              borderRadius: 16,
            }}
          >
            {items.map((it) => (
              <View key={it.product_variant_id} style={{ marginBottom: 10 }}>
                <Text style={{ fontWeight: "800" }}>{it.title}</Text>

                {/* чекбокс Со склада / Под заказ */}
                <Pressable
                  onPress={() => toggleFromStock(it.product_variant_id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 6,
                    marginBottom: 2,
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0.4)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 6,
                      backgroundColor: it.is_from_shop_stock
                        ? "#111"
                        : "transparent",
                    }}
                  >
                    {it.is_from_shop_stock && (
                      <Text style={{ color: "#fff", fontSize: 12 }}>✓</Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 13 }}>
                    {it.is_from_shop_stock ? "С магазина" : "Под заказ"}
                  </Text>
                </Pressable>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 4,
                  }}
                >
                  <Text style={{ marginRight: 10 }}>
                    Цена: {it.unit_price} BYN
                  </Text>
                  <TextInput
                    value={String(it.quantity)}
                    onChangeText={(v) =>
                      setQty(it.product_variant_id, Number(v))
                    }
                    keyboardType="numeric"
                    style={{
                      width: 70,
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0.12)",
                      borderRadius: 12,
                      padding: 8,
                      marginRight: 10,
                    }}
                  />
                  <Pressable
                    onPress={() => removeItem(it.product_variant_id)}
                    style={{ padding: 8 }}
                  >
                    <Text style={{ color: "crimson", fontWeight: "800" }}>
                      Удалить
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
            <Text style={{ fontWeight: "900" }}>
              Итого (UI): {totalUi.toFixed(2)} BYN
            </Text>
          </View>
        )}

        {/* Ошибки под формой */}
        {validationErrors.length > 0 && (
          <View style={{ marginTop: 12 }}>
            {validationErrors.map((e) => (
              <Text key={e} style={{ color: "crimson", marginTop: 2 }}>
                • {e}
              </Text>
            ))}
          </View>
        )}

        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={{
            marginTop: 16,
            backgroundColor: "#111",
            paddingVertical: 14,
            borderRadius: 14,
            opacity: canSubmit ? 1 : 0.5,
          }}
        >
          <Text
            style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}
          >
            {saving ? "Создаём…" : "Создать заказ"}
          </Text>
        </Pressable>

        <SelectModal
          visible={openProduct}
          title="Выберите товар"
          items={activeProducts.map((p) => ({ id: p.id, label: p.name }))}
          onClose={() => setOpenProduct(false)}
          onSelect={(id) => {
            setSelectedProductId(id);
            setSelectedVariantId(null);
            setOpenProduct(false);
          }}
        />

        <SelectModal
          visible={openVariant}
          title="Выберите вариант"
          items={activeVariants.map((v) => ({
            id: v.id,
            label: `${v.material?.name ?? ""} • ${v.sku}`,
            right: `${v.price} BYN`,
          }))}
          onClose={() => setOpenVariant(false)}
          onSelect={(id) => {
            setSelectedVariantId(id);
            setOpenVariant(false);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
