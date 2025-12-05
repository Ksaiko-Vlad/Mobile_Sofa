import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";

type Role = "customer" | "manager" | "driver" | "factory_worker" | "admin";

export function RequireRole({
  allow,
  children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const { token, user, hydrating } = useAuth();

  if (hydrating) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!token) return <Redirect href={"/(auth)/login" as any} />;

  const role = user?.role as Role | undefined;
  if (!role || !allow.includes(role)) {
    return <Redirect href={"/(tabs)/account" as any} />;
  }

  return <>{children}</>;
}
