import { apiFetch } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ProfileUpdatePayload = {
  first_name?: string | null;
  last_name?: string | null;
  second_name?: string | null;
  phone?: string | null;
};

export async function getStoredUser() {
  const u = await AsyncStorage.getItem("user");
  return u ? JSON.parse(u) : null;
}

export async function setStoredUser(user: any) {
  await AsyncStorage.setItem("user", JSON.stringify(user));
}

export async function updateProfile(payload: ProfileUpdatePayload) {
  const res = await apiFetch("/api/v1/user/update", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res;
}
