import { RequireRole } from "@/components/RequireRole";
import { Stack } from "expo-router";
import React from "react";

export default function FactoryWorkerLayout() {
  return (
    <RequireRole allow={["factory_worker", "admin"]}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </RequireRole>
  );
}