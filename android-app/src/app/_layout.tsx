import * as SystemUI from "expo-system-ui";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { colors } from "@/lib/tokens";

SystemUI.setBackgroundColorAsync(colors.paper);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    NotoSerifSC_400Regular: require("@expo-google-fonts/noto-serif-sc/400Regular/NotoSerifSC_400Regular.ttf"),
    NotoSerifSC_600SemiBold: require("@expo-google-fonts/noto-serif-sc/600SemiBold/NotoSerifSC_600SemiBold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
      }}
    />
  );
}
