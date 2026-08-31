import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { submitPost, type PickedImage } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/tokens";

const LINE_HEIGHT = 34;
const RULE_LINES = 7;

export default function ComposeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [target, setTarget] = useState("");
  const [content, setContent] = useState("");
  const [penName, setPenName] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function pickImages() {
    const remaining = 9 - images.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (result.canceled) return;
    setImages((prev) =>
      [
        ...prev,
        ...result.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType })),
      ].slice(0, 9),
    );
  }

  async function handleSubmit() {
    if (!content.trim()) {
      Alert.alert("还一个字都没写呢");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const r = await submitPost({
        content: content.trim(),
        target: target.trim() || null,
        author: anonymous ? null : penName.trim() || null,
        images,
      });
      Alert.alert(
        r.status === "approved" ? "已经上墙了" : "投出去了",
        r.status === "approved"
          ? "内容通过审核，现在就能在墙上看到。"
          : "审核通过后会自动上墙，可在「我的」里看进度。",
        [{ text: "好", onPress: () => router.replace("/(tabs)") }],
      );
      setContent("");
      setTarget("");
      setImages([]);
    } catch (e) {
      Alert.alert("没投出去", e instanceof Error ? e.message : "请稍后再试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <View style={[styles.nav, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.navTitle}>写一封信</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.writeTo}>
          <Text style={styles.writeToPre}>写给</Text>
          <TextInput
            value={target}
            onChangeText={setTarget}
            placeholder="那个人，或那件事（可不填）"
            placeholderTextColor={colors.inkMuted}
            style={styles.writeToInput}
            maxLength={20}
          />
        </View>

        <Text style={styles.label}>
          <Text style={styles.labelAccent}>落笔</Text>
        </Text>
        <View style={styles.paper}>
          <View style={styles.lines} pointerEvents="none">
            {Array.from({ length: RULE_LINES }).map((_, i) => (
              <View key={i} style={styles.line} />
            ))}
          </View>
          <TextInput
            value={content}
            onChangeText={setContent}
            multiline
            placeholder="想说的话，墙替你保密。"
            placeholderTextColor={colors.inkMuted}
            style={styles.paperInput}
            maxLength={1000}
          />
        </View>
        <Text style={styles.counter}>{content.length} / 1000</Text>

        <View style={styles.rowLabel}>
          <Text style={styles.label}>署名</Text>
          <View style={styles.chips}>
            <Pressable
              style={[styles.chip, anonymous && styles.chipOn]}
              onPress={() => setAnonymous(true)}
            >
              <Text style={[styles.chipText, anonymous && styles.chipTextOn]}>匿名</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, !anonymous && styles.chipOn]}
              onPress={() => setAnonymous(false)}
            >
              <Text style={[styles.chipText, !anonymous && styles.chipTextOn]}>笔名</Text>
            </Pressable>
          </View>
        </View>
        {!anonymous && (
          <TextInput
            value={penName}
            onChangeText={setPenName}
            placeholder="署一个名字（不填则显示匿名）"
            placeholderTextColor={colors.inkMuted}
            style={styles.penInput}
            maxLength={20}
          />
        )}

        <Text style={styles.label}>附图</Text>
        <View style={styles.imgs}>
          {images.map((img, i) => (
            <View key={i} style={styles.imgCell}>
              <ImageThumb uri={img.uri} />
              <Pressable
                style={styles.imgRemove}
                onPress={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                accessibilityLabel="移除图片"
              >
                <Text style={styles.imgRemoveText}>×</Text>
              </Pressable>
            </View>
          ))}
          {images.length < 9 && (
            <Pressable style={styles.imgAdd} onPress={pickImages}>
              <Text style={styles.imgAddPlus}>＋</Text>
              <Text style={styles.imgAddText}>添加</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.rules}>
          <Text style={styles.rulesText}>
            投稿经审核后上墙 · 含敏感词将被退回{"\n"}
            十分钟内最多投稿三篇 · 图片不超过 5MB
          </Text>
        </View>

        <Pressable
          style={[styles.submit, submitting && styles.submitting]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitText}>{submitting ? "投递中" : "投递"}</Text>
        </Pressable>
        <Text style={styles.submitHint}>未通过审核的内容不会公开展示</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ImageThumb({ uri }: { uri: string }) {
  return (
    <View style={styles.thumb} accessible accessibilityLabel="已选图片">
      <Image
        source={{ uri }}
        style={styles.thumbImage}
        contentFit="cover"
        recyclingKey={uri}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  back: {
    fontSize: 22,
    color: colors.inkSoft,
    lineHeight: 26,
  },
  navTitle: {
    fontFamily: fonts.serifSemi,
    fontSize: 16,
    letterSpacing: 2,
    color: colors.ink,
  },
  form: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  writeTo: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212, 91, 61, 0.4)",
    borderStyle: "dashed",
    paddingBottom: 8,
    marginTop: 8,
    marginBottom: 22,
  },
  writeToPre: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.ink,
  },
  writeToInput: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    padding: 0,
  },
  label: {
    fontFamily: fonts.serif,
    fontSize: 13,
    letterSpacing: 2,
    color: colors.inkSoft,
    marginBottom: 10,
  },
  labelAccent: {
    color: colors.vermilionDeep,
    fontFamily: fonts.serifSemi,
  },
  paper: {
    height: LINE_HEIGHT * RULE_LINES + 20,
    borderRadius: radius.card - 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.paperSoft,
  },
  lines: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  line: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    marginBottom: LINE_HEIGHT - 1,
  },
  paperInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    lineHeight: LINE_HEIGHT,
    fontFamily: fonts.serif,
    color: colors.ink,
    textAlignVertical: "top",
  },
  counter: {
    textAlign: "right",
    fontSize: 10.5,
    color: colors.inkMuted,
    marginTop: 6,
  },
  rowLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 0,
  },
  chips: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  chipOn: {
    borderColor: colors.vermilion,
    backgroundColor: colors.vermilionSoft,
  },
  chipText: {
    fontSize: 12,
    color: colors.inkSoft,
  },
  chipTextOn: {
    color: colors.vermilionDeep,
    fontFamily: fonts.serifSemi,
  },
  penInput: {
    marginTop: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    paddingBottom: 8,
    fontSize: 13,
    color: colors.ink,
    padding: 0,
  },
  imgs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  imgCell: {
    width: 106,
    height: 106,
  },
  thumb: {
    flex: 1,
    borderRadius: radius.photo,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    overflow: "hidden",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  imgRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(34, 24, 18, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  imgRemoveText: {
    color: colors.paper,
    fontSize: 10,
    lineHeight: 12,
  },
  imgAdd: {
    width: 106,
    height: 106,
    borderRadius: radius.photo,
    borderWidth: 1,
    borderColor: "rgba(138, 133, 129, 0.6)",
    borderStyle: "dashed",
    backgroundColor: "rgba(255, 255, 255, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  imgAddPlus: {
    fontSize: 20,
    fontWeight: "300",
    color: colors.inkSoft,
  },
  imgAddText: {
    fontSize: 10,
    color: colors.inkMuted,
  },
  rules: {
    marginTop: 22,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  rulesText: {
    fontSize: 11,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  submit: {
    marginTop: 18,
    height: 48,
    borderRadius: radius.chip + 2,
    backgroundColor: colors.vermilion,
    alignItems: "center",
    justifyContent: "center",
  },
  submitting: {
    backgroundColor: colors.vermilionDeep,
    opacity: 0.8,
  },
  submitText: {
    color: colors.paper,
    fontFamily: fonts.serifSemi,
    fontSize: 16,
    letterSpacing: 10,
    // 视觉上让字距居中：letterSpacing 会在末尾多出一份，用 marginRight 补回
    marginRight: -10,
  },
  submitHint: {
    textAlign: "center",
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 10,
  },
});
