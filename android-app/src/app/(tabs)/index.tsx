import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { likePost, fetchPosts, type Post, type PostsPage } from "@/lib/api";
import { PostCard } from "@/components/PostCard";
import { Seal } from "@/components/Seal";
import { colors, fonts } from "@/lib/tokens";

function SkeletonCard() {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setPulse((p) => !p), 700);
    return () => clearInterval(t);
  }, []);
  return (
    <View style={[styles.card, { opacity: pulse ? 0.55 : 0.9 }]}>
      <View style={[styles.skLine, { width: "60%" }]} />
      <View style={[styles.skLine, { width: "90%" }]} />
      <View style={[styles.skLine, { width: "75%", marginBottom: 0 }]} />
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[]>([]);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadingMore = useRef(false);

  const applyPage = useCallback((page: PostsPage, append: boolean) => {
    setAnnouncement(page.announcements[0]?.title ?? null);
    setCursor(page.nextCursor);
    const merged = append ? [...posts, ...page.pinned, ...page.items] : [...page.pinned, ...page.items];
    setPosts(merged);
  }, [posts]);

  const load = useCallback(async (append = false, nextCursor?: number | null) => {
    if (loadingMore.current) return;
    loadingMore.current = true;
    try {
      const page = await fetchPosts(nextCursor);
      applyPage(page, append);
    } catch {
      // 保留已有内容，静默失败
    } finally {
      loadingMore.current = false;
      setLoading(false);
    }
  }, [applyPage]);

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  }, [load]);

  const columns: Post[][] = [
    posts.filter((_, i) => i % 2 === 0),
    posts.filter((_, i) => i % 2 === 1),
  ];

  return (
    <View style={styles.screen}>
      <View style={[styles.nav, { paddingTop: insets.top + 4 }]}>
        <Seal chars={["白", "墙"]} />
        <Text style={styles.navTitle}>白墙</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.vermilion} />
        }
        onScroll={(e) => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          if (
            cursor &&
            !loadingMore.current &&
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 400
          ) {
            load(true, cursor);
          }
        }}
        scrollEventThrottle={200}
      >
        {announcement && (
          <View style={styles.notice}>
            <Text style={styles.noticeTag}>告</Text>
            <Text style={styles.noticeText} numberOfLines={1}>
              {announcement}
            </Text>
            <Text style={styles.noticeMore}>›</Text>
          </View>
        )}

        <View style={styles.masonry}>
          {columns.map((col, ci) => (
            <View key={ci} style={styles.column}>
              {col.map((p) => (
                <PostCard key={p.id} post={p} onLike={likePost} />
              ))}
            </View>
          ))}
        </View>

        {loading && (
          <View style={styles.masonry}>
            <View style={styles.column}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
            <View style={styles.column}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          </View>
        )}
        {!loading && cursor && (
          <ActivityIndicator color={colors.vermilion} style={styles.more} />
        )}
        {!loading && !cursor && posts.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>墙上还没有字</Text>
            <Text style={styles.emptyHint}>点下面的「投」字，写下第一句</Text>
          </View>
        )}
      </ScrollView>
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
  navTitle: {
    fontFamily: fonts.serifSemi,
    fontSize: 18,
    letterSpacing: 2,
    color: colors.ink,
  },
  scroll: {
    paddingBottom: 110,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.paperSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: 8,
  },
  noticeTag: {
    fontFamily: fonts.serifSemi,
    color: colors.mossDeep,
    fontSize: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: colors.inkSoft,
  },
  noticeMore: {
    color: colors.inkMuted,
    fontSize: 14,
  },
  masonry: {
    flexDirection: "row",
    paddingHorizontal: 12,
  },
  column: {
    flex: 1,
    gap: 10,
    paddingHorizontal: 5,
  },
  card: {
    backgroundColor: colors.paperSoft,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
  },
  skLine: {
    height: 12,
    borderRadius: 4,
    backgroundColor: colors.line,
    marginBottom: 8,
  },
  more: {
    marginVertical: 16,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontFamily: fonts.serifSemi,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 12,
    color: colors.inkMuted,
  },
});
