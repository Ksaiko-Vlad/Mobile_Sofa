import { useAuth } from "@/hooks/useAuth";
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

export default function LoginScreen() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+375");

  const canSubmit = useMemo(() => {
    return email.trim() && password.trim() && isValidPhoneBY(phone);
  }, [email, password, phone]);

  const onSubmit = async () => {
    const p = normalizePhone(phone);

    if (!email.trim()) return Alert.alert("Ошибка", "Введите email");
    if (!password.trim()) return Alert.alert("Ошибка", "Введите пароль");
    if (!isValidPhoneBY(p)) {
      Alert.alert("Ошибка", "Телефон должен быть строго +375XXXXXXXXX (13 символов)");
      return;
    }

    try {
      await login(email.trim(), password, p);
      router.replace("/account" as any);
    } catch (e: any) {
      Alert.alert("Ошибка входа", e.message);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Вход</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <Text style={styles.label}>Пароль</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            style={styles.input}
          />

          <Text style={styles.label}>Телефон</Text>
          <TextInput
            value={phone}
            onChangeText={(v) => setPhone(normalizePhone(v))}
            keyboardType="phone-pad"
            placeholder="+375291234567"
            style={styles.input}
            maxLength={13}
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
            <Text style={styles.btnText}>{loading ? "Входим..." : "Войти"}</Text>
          </Pressable>

          <Pressable onPress={() => router.push("/register" as any)} style={{ marginTop: 10 }}>
            <Text style={styles.link}>Нет аккаунта? Регистрация</Text>
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
