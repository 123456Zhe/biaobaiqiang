import { Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { colors, fonts, radius } from "@/lib/tokens";

function HouseIcon({ color }: { color: string }) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24">
      <Path
        d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PersonIcon({ color }: { color: string }) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24">
      <Circle cx={12} cy={8} r={4} fill="none" stroke={color} strokeWidth={1.8} />
      <Path
        d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function TabItem({
  label,
  active,
  onPress,
  children,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const color = active ? colors.vermilionDeep : colors.inkMuted;
  return (
    <Pressable onPress={onPress} style={styles.tab} accessibilityLabel={label}>
      {children}
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

function TabBar({ state, navigation }: { state: any; navigation: any }) {
  const insets = useSafeAreaInsets();
  const activeIndex = state.index;

  function go(name: string) {
    const event = navigation.emit({
      type: "tabPress",
      target: state.routes.find((r: any) => r.name === name)?.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(name);
    }
  }

  return (
    <View style={[styles.bar, { paddingBottom: 18 + insets.bottom }]}>
      <TabItem
        label="白墙"
        active={activeIndex === 0}
        onPress={() => go("index")}
      >
        <HouseIcon color={activeIndex === 0 ? colors.vermilionDeep : colors.inkMuted} />
      </TabItem>
      <Pressable
        onPress={() => go("compose")}
        style={styles.compose}
        accessibilityLabel="投稿"
      >
        <View
          style={[
            styles.composeSeal,
            activeIndex === 1 && styles.composeSealActive,
          ]}
        >
          <Text style={styles.composeChar}>投</Text>
        </View>
        <Text style={styles.composeLabel}>投稿</Text>
      </Pressable>
      <TabItem
        label="我的"
        active={activeIndex === 2}
        onPress={() => go("me")}
      >
        <PersonIcon color={activeIndex === 2 ? colors.vermilionDeep : colors.inkMuted} />
      </TabItem>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="compose" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(252, 250, 246, 0.94)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  tab: {
    width: 64,
    alignItems: "center",
    gap: 3,
  },
  tabLabel: {
    fontSize: 10.5,
  },
  compose: {
    alignItems: "center",
    gap: 3,
    transform: [{ translateY: -16 }],
  },
  composeSeal: {
    width: 46,
    height: 46,
    borderRadius: radius.seal,
    backgroundColor: colors.vermilion,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(252, 250, 246, 0.3)",
    shadowColor: colors.vermilionDeep,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  composeSealActive: {
    backgroundColor: colors.vermilionDeep,
  },
  composeChar: {
    color: colors.paper,
    fontFamily: fonts.serifSemi,
    fontSize: 21,
  },
  composeLabel: {
    fontSize: 10.5,
    color: colors.inkSoft,
  },
});
