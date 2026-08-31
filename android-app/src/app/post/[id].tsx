import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import ImageViewing from "react-native-image-viewing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  addComment,
  fetchPostDetail,
  imageUrl,
  likePost,
  timeAgo,
  type Comment,
  type PostDetail,
} from "@/lib/api";
import { colors, fonts, radius } from "@/lib/tokens";

function Heart({ size, color, filled }: { size: number; color: string; filled: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 21s-7-4.5-9.5-9.5C.8 7.8 3.4 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 3.6 0 6.2 3.8 4.5 7.5C19 16.5 12 21 12 21z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [penName, setPenName] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; error: boolean } | null>(
    null,
  );
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetchPostDetail(Number(id));
      setPost(r.post);
      setComments(r.comments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLike() {
    if (!post || post.liked) return;
    setPost({ ...post, liked: true, likeCount: post.likeCount + 1 });
    try {
      const n = await likePost(post.id);
      setPost((p) => (p ? { ...p, likeCount: n } : p));
    } catch {
      setPost((p) => (p ? { ...p, liked: false, likeCount: p.likeCount - 1 } : p));
    }
  }

  async function handleSend() {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      const r = await addComment(Number(id), draft.trim(), penName.trim() || null);
      setDraft("");
      setNotice(
        r.status === "approved"
          ? { msg: "评论已上墙", error: false }
          : { msg: "评论已提交，审核通过后展示", error: false },
      );
      if (r.status === "approved") load();
    } catch (e) {
      setNotice({
        msg: e instanceof Error ? e.message : "没发出去，请稍后再试",
        error: true,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <View style={[styles.nav, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.navTitle}>帖 子</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {error && <Text style={styles.error}>{error}</Text>}
        {!post && !error && <Text style={styles.loading}>读取中…</Text>}
        {post && (
          <>
            <View style={styles.paperCard}>
              {post.target && (
                <View style={styles.to}>
                  <Text style={styles.toLabel}>写给 </Text>
                  <Text style={styles.toName}>{post.target}</Text>
                </View>
              )}
              <Text style={styles.content}>{post.content}</Text>
              {post.imageList.map((src, i) => (
                <Pressable key={i} onPress={() => setViewerIndex(i)}>
                  <Image
                    source={{ uri: imageUrl(src) }}
                    style={styles.image}
                    contentFit="cover"
                    recyclingKey={src}
                  />
                </Pressable>
              ))}
              <View style={styles.footer}>
                <Text style={styles.meta}>
                  — {post.author ?? "匿名"} · {timeAgo(post.createdAt)}
                </Text>
                <Pressable
                  onPress={handleLike}
                  hitSlop={8}
                  style={styles.heartWrap}
                  accessibilityLabel="点赞"
                >
                  <Heart
                    size={16}
                    color={post.liked ? colors.vermilion : colors.inkMuted}
                    filled={post.liked}
                  />
                  <Text style={[styles.count, post.liked && styles.countLiked]}>
                    {post.likeCount}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.commentsHead}>
              <Text style={styles.commentsTitle}>回 帖</Text>
              <Text style={styles.commentsCount}>{comments.length}</Text>
            </View>
            {notice && (
              <View
                style={[
                  styles.notice,
                  notice.error ? styles.noticeError : styles.noticeOk,
                ]}
              >
                <Text
                  style={
                    notice.error ? styles.noticeErrorText : styles.noticeOkText
                  }
                >
                  {notice.msg}
                </Text>
              </View>
            )}
            {comments.length === 0 && !notice && (
              <Text style={styles.empty}>还没有回帖，说点什么吧</Text>
            )}
            {comments.map((c) => (
              <View key={c.id} style={styles.commentRow}>
                <View style={styles.commentBody}>
                  <Text style={styles.commentName}>
                    {c.name ?? "匿名"}
                    <Text style={styles.commentTime}> · {timeAgo(c.createdAt)}</Text>
                  </Text>
                  <Text style={styles.commentContent}>{c.content}</Text>
                </View>
                {c.mine && (
                  <View style={styles.mineBadge}>
                    <Text style={styles.mineBadgeText}>我</Text>
                  </View>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <ImageViewing
        images={(post?.imageList ?? []).map((src) => ({ uri: imageUrl(src) }))}
        imageIndex={viewerIndex ?? 0}
        visible={viewerIndex !== null}
        onRequestClose={() => setViewerIndex(null)}
      />

      <View style={[styles.inputBar, { paddingBottom: 12 + insets.bottom }]}>
        <TextInput
          value={penName}
          onChangeText={setPenName}
          placeholder="称呼"
          placeholderTextColor={colors.inkMuted}
          style={styles.nameInput}
          maxLength={20}
        />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="写一句回帖…"
          placeholderTextColor={colors.inkMuted}
          style={styles.commentInput}
          maxLength={500}
          multiline
        />
        <Pressable
          onPress={handleSend}
          disabled={sending}
          style={[styles.send, sending && styles.sending]}
          accessibilityLabel="发送评论"
        >
          <Text style={styles.sendText}>{sending ? "…" : "寄"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  body: {
    padding: 16,
    paddingBottom: 40,
  },
  loading: {
    textAlign: "center",
    color: colors.inkMuted,
    fontSize: 12,
    paddingVertical: 40,
  },
  error: {
    textAlign: "center",
    color: colors.crimson,
    fontSize: 13,
    paddingVertical: 40,
  },
  paperCard: {
    backgroundColor: colors.paperSoft,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: 18,
  },
  to: {
    flexDirection: "row",
    marginBottom: 10,
  },
  toLabel: {
    fontSize: 12,
    color: colors.inkMuted,
    fontFamily: fonts.serif,
  },
  toName: {
    fontSize: 12,
    color: colors.vermilionDeep,
    fontFamily: fonts.serifSemi,
  },
  content: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 29,
    color: colors.ink,
  },
  image: {
    marginTop: 12,
    width: "100%",
    height: 210,
    borderRadius: radius.photo,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  footer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  meta: {
    fontSize: 11.5,
    color: colors.inkMuted,
    flexShrink: 1,
  },
  heartWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  count: {
    fontSize: 12,
    color: colors.inkMuted,
    fontVariant: ["tabular-nums"],
  },
  countLiked: {
    color: colors.vermilion,
  },
  commentsHead: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 22,
    marginBottom: 6,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  commentsTitle: {
    fontFamily: fonts.serifSemi,
    fontSize: 13,
    letterSpacing: 2,
    color: colors.inkSoft,
  },
  commentsCount: {
    fontSize: 11,
    color: colors.inkMuted,
    fontVariant: ["tabular-nums"],
  },
  notice: {
    marginVertical: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.chip,
  },
  noticeOk: {
    backgroundColor: colors.mossSoft,
  },
  noticeError: {
    backgroundColor: colors.crimsonSoft,
  },
  noticeOkText: {
    fontSize: 12,
    color: colors.mossDeep,
  },
  noticeErrorText: {
    fontSize: 12,
    color: colors.crimson,
  },
  empty: {
    textAlign: "center",
    fontSize: 12,
    color: colors.inkMuted,
    paddingVertical: 28,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.lineFaint,
  },
  commentBody: {
    flex: 1,
    minWidth: 0,
  },
  commentName: {
    fontSize: 12,
    color: colors.inkSoft,
    fontFamily: fonts.serifSemi,
    marginBottom: 3,
  },
  commentTime: {
    color: colors.inkMuted,
    fontFamily: undefined,
    fontWeight: "400",
    fontSize: 10.5,
  },
  commentContent: {
    fontFamily: fonts.serif,
    fontSize: 13.5,
    lineHeight: 24,
    color: colors.ink,
  },
  mineBadge: {
    marginTop: 2,
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: colors.vermilionSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  mineBadgeText: {
    fontSize: 10,
    color: colors.vermilionDeep,
    fontFamily: fonts.serifSemi,
  },
  inputBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "rgba(252, 250, 246, 0.96)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  nameInput: {
    width: 64,
    minHeight: 38,
    borderRadius: radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.ink,
  },
  commentInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 90,
    borderRadius: radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.ink,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.vermilion,
    alignItems: "center",
    justifyContent: "center",
  },
  sending: {
    backgroundColor: colors.vermilionDeep,
    opacity: 0.7,
  },
  sendText: {
    color: colors.paper,
    fontFamily: fonts.serifSemi,
    fontSize: 15,
  },
});
