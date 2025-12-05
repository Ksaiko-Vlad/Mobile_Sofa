import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { router } from "expo-router";
import { useMemo, useState } from "react";
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

function normalizePhone(v: string) {
  return String(v ?? "").replace(/[^\d+]/g, "").replace(/\s+/g, "").trim();
}

// строго 13 символов: +375 + 9 цифр
function isValidPhoneBY(v: string) {
  const p = normalizePhone(v);
  return /^\+375\d{9}$/.test(p);
}

export default function RegisterScreen() {
  const { register, loading } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+375");
  const [password, setPassword] = useState("");

  const canSubmit = useMemo(() => {
    return (
      firstName.trim() &&
      lastName.trim() &&
      email.trim() &&
      isValidPhoneBY(phone) &&
      password.trim().length >= 6
    );
  }, [firstName, lastName, email, phone, password]);

  const onSubmit = async () => {
    const p = normalizePhone(phone);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      Alert.alert("Проверьте данные", "Заполните обязательные поля.");
      return;
    }
    if (!isValidPhoneBY(p)) {
      Alert.alert("Проверьте данные", "Телефон должен быть строго +375XXXXXXXXX (13 символов)");
      return;
    }
    if (password.trim().length < 6) {
      Alert.alert("Проверьте данные", "Пароль минимум 6 символов.");
      return;
    }

    try {
      await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        second_name: secondName.trim() || undefined,
        email: email.trim(),
        phone: p,
        password,
      });

      router.replace("/(tabs)/account" as any);
    } catch (e: any) {
      if (e instanceof ApiError) {
        if (e.status === 409) return Alert.alert("Не получилось", e.message);
        if (e.status === 400) return Alert.alert("Неверные данные", e.message);
        return Alert.alert("Ошибка", e.message);
      }
      Alert.alert("Ошибка", e?.message || "Что-то пошло не так");
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Регистрация</Text>

          <Text style={styles.label}>Имя</Text>
          <TextInput value={firstName} onChangeText={setFirstName} placeholder="Иван" style={styles.input} />

          <Text style={styles.label}>Фамилия</Text>
          <TextInput value={lastName} onChangeText={setLastName} placeholder="Иванов" style={styles.input} />

          <Text style={styles.label}>Отчество</Text>
          <TextInput value={secondName} onChangeText={setSecondName} placeholder="Иванович" style={styles.input} />

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <Text style={styles.label}>Телефон</Text>
          <TextInput
            value={phone}
            onChangeText={(v) => setPhone(normalizePhone(v))}
            placeholder="+375291234567"
            keyboardType="phone-pad"
            style={styles.input}
            maxLength={13}
          />

          <Text style={styles.label}>Пароль</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            style={styles.input}
          />

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit || loading}
            style={({ pressed }) => [
              styles.btn,
              (!canSubmit || loading) && styles.btnDisabled,
              pressed && canSubmit && !loading && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.btnText}>{loading ? "Регистрируем..." : "Зарегистрироваться"}</Text>
          </Pressable>

          <Pressable onPress={() => router.replace("/(auth)/login" as any)} style={{ marginTop: 10 }}>
            <Text style={styles.link}>Уже есть аккаунт? Войти</Text>
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
  title: { fontSize: 34, fontWeight: "800", textAlign: "center", marginBottom: 18 },
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
