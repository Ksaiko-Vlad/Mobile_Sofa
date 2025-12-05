import { ApiError } from "@/lib/api";
import { ProfileUpdatePayload, updateProfile } from "@/lib/profile";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

function normalizeText(v: unknown) {
  return String(v ?? "").trim();
}

function normalizePhone(v: string) {
  // оставляем только + и цифры
  return v.replace(/[^\d+]/g, "").replace(/\s+/g, "").trim();
}

// ✅ строго 13 символов: "+375" + 9 цифр = 13
function isValidPhone(v: string) {
  const p = normalizePhone(v);
  if (!p) return true; // телефон можно оставить пустым (оставил как у тебя)
  return /^\+375\d{9}$/.test(p);
}

function isValidName(v: string) {
  const s = normalizeText(v);
  if (!s) return true; // поле необязательное
  if (s.length < 2 || s.length > 50) return false;

  // буквы (любой язык) + пробелы + дефис + апостроф + точка
  return /^[\p{L} .'-]+$/u.test(s);
}

export default function AccountScreen() {
  const [loading, setLoading] = useState(false);
  const [initialUser, setInitialUser] = useState<any>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    (async () => {
      const uRaw = await AsyncStorage.getItem("user");
      const u = uRaw ? JSON.parse(uRaw) : null;

      setInitialUser(u);
      setFirstName(u?.first_name ?? "");
      setLastName(u?.last_name ?? "");
      setSecondName(u?.second_name ?? "");
      setEmail(u?.email ?? "");
      setPhone(u?.phone ?? "");
    })();
  }, []);

  const validationErrors = useMemo(() => {
    const errs: string[] = [];

    if (!isValidName(firstName)) errs.push("Имя: только буквы (2–50 символов)");
    if (!isValidName(lastName)) errs.push("Фамилия: только буквы (2–50 символов)");
    if (!isValidName(secondName)) errs.push("Отчество: только буквы (2–50 символов)");

    if (!isValidPhone(phone)) errs.push("Телефон: строго +375XXXXXXXXX (13 символов)");

    return errs;
  }, [firstName, lastName, secondName, phone]);

  const isDirty = useMemo(() => {
    if (!initialUser) return false;

    const iFirst = normalizeText(initialUser?.first_name);
    const iLast = normalizeText(initialUser?.last_name);
    const iSecond = normalizeText(initialUser?.second_name);
    const iPhone = normalizePhone(String(initialUser?.phone ?? ""));

    const nFirst = normalizeText(firstName);
    const nLast = normalizeText(lastName);
    const nSecond = normalizeText(secondName);
    const nPhone = normalizePhone(phone);

    return iFirst !== nFirst || iLast !== nLast || iSecond !== nSecond || iPhone !== nPhone;
  }, [initialUser, firstName, lastName, secondName, phone]);

  const canSave = useMemo(() => {
    if (!initialUser) return false;
    if (loading) return false;
    if (!isDirty) return false;
    if (validationErrors.length > 0) return false;
    return true;
  }, [initialUser, loading, isDirty, validationErrors.length]);

  const onSave = async () => {
    if (validationErrors.length > 0) {
      Alert.alert("Проверьте данные", validationErrors.join("\n"));
      return;
    }

    try {
      setLoading(true);

      const payload: ProfileUpdatePayload = {
        first_name: normalizeText(firstName) || null,
        last_name: normalizeText(lastName) || null,
        second_name: normalizeText(secondName) || null,
        phone: normalizePhone(phone) || null,
      };

      await updateProfile(payload);

      const nextUser = { ...initialUser, ...payload };
      await AsyncStorage.setItem("user", JSON.stringify(nextUser));
      setInitialUser(nextUser);

      Alert.alert("Готово", "Изменения сохранены");
    } catch (e: any) {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("user");
          router.replace("/(auth)/login" as any);
          return;
        }
        if (e.status === 409) return Alert.alert("Не удалось", e.message);
        if (e.status === 400) return Alert.alert("Неверные данные", e.message);
        return Alert.alert("Ошибка", e.message);
      }
      Alert.alert("Ошибка", e?.message || "Что-то пошло не так");
    } finally {
      setLoading(false);
    }
  };

  if (!initialUser) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Загрузка…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Личная информация</Text>

          <Text style={styles.label}>Имя</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Петя"
            style={styles.input}
          />

          <Text style={styles.label}>Фамилия</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Иванов"
            style={styles.input}
          />

          <Text style={styles.label}>Отчество</Text>
          <TextInput
            value={secondName}
            onChangeText={setSecondName}
            placeholder="Петрович"
            style={styles.input}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput value={email} editable={false} style={[styles.input, styles.inputDisabled]} />

          <Text style={styles.label}>Телефон</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+375291234567"
            style={styles.input}
            maxLength={13} // ✅ чтобы физически не дать ввести длиннее
          />

          {validationErrors.length > 0 && (
            <View style={{ marginTop: 10 }}>
              {validationErrors.map((e) => (
                <Text key={e} style={{ color: "crimson", marginTop: 2 }}>
                  • {e}
                </Text>
              ))}
            </View>
          )}

          {!isDirty && <Text style={{ marginTop: 10, opacity: 0.65 }}>Нет изменений</Text>}

          <Pressable
            onPress={onSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.btn,
              !canSave && styles.btnDisabled,
              pressed && canSave && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.btnText}>
              {loading ? "Сохраняем..." : "Сохранить изменения"}
            </Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              await AsyncStorage.removeItem("token");
              await AsyncStorage.removeItem("user");
              router.replace("/(auth)/login" as any);
            }}
            style={{ marginTop: 12 }}
          >
            <Text style={styles.link}>Выйти</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 20, justifyContent: "center" },
  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 18,
    padding: 18,
    backgroundColor: "#fff",
  },
  title: { fontSize: 30, fontWeight: "900", marginBottom: 18 },
  label: { fontSize: 14, marginTop: 10, marginBottom: 6, opacity: 0.8 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  inputDisabled: {
    backgroundColor: "rgba(0,0,0,0.06)",
    opacity: 0.8,
  },
  btn: {
    marginTop: 16,
    backgroundColor: "#111",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  link: { textAlign: "center", opacity: 0.75, fontSize: 14 },
});
