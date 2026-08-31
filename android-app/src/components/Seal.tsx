import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/lib/tokens";

export function Seal({ chars, size = 30 }: { chars: string[]; size?: number }) {
  return (
    <View
      style={[
        styles.seal,
        {
          width: size,
          height: size,
          borderRadius: size * 0.2,
        },
      ]}
    >
      {chars.map((c, i) => (
        <Text key={i} style={[styles.char, { fontSize: size * 0.36 }]}>
          {c}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  seal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.vermilion,
    borderWidth: 1.5,
    borderColor: "rgba(252, 250, 246, 0.35)",
  },
  char: {
    color: colors.paper,
    fontFamily: fonts.serifSemi,
    textAlign: "center",
  },
});
