// app/driver/layout.tsx
import { RequireRole } from "@/components/RequireRole";
import { Stack } from "expo-router";
import React from "react";

export default function DriverLayout() {
  return (
    <RequireRole allow={["driver", "admin"]}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="active" />
      </Stack>
    </RequireRole>
  );
}