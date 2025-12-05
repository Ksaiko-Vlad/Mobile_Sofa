import { RequireRole } from "@/components/RequireRole";
import { Stack } from "expo-router";
import React from "react";

export default function ManagerLayout() {
  return (
    <RequireRole allow={["manager", "admin"]}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="create" />
      </Stack>
    </RequireRole>
  );
}
