import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchMyPosts, timeAgo, type MyPost } from "@/lib/api";
import { colors, fonts } from "@/lib/tokens";

const STATUS: Record<
  MyPost["status"],
  { label: string; bg: string; fg: string }
> = {
  pending: { label: "待审核", bg: colors.amberSoft, fg: colors.amberDeep },
  approved: { label: "已上墙", bg: colors.mossSoft, fg: colors.mossDeep },
  rejected: { label: "未通过", bg: colors.crimsonSoft, fg: colors.crimson },
};

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MyPost[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await fetchMyPosts());
    } catch {
      if (items === null) setItems([]);
    }
  }, [items]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approved = items?.filter((p) => p.status === "approved").length ?? 0;
  const likes = 0; // 后端暂无按访客聚合的获赞数，接口就绪后接入

  return (
    <View style={styles.screen}>
      <View style={[styles.nav, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.navTitle}>我的</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.vermilion}
          />
        }
      >
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarChar}>客</Text>
          </View>
          <View>
            <Text style={styles.name}>微信用户</Text>
            <Text style={styles.stats}>
              投稿 <Text style={styles.statsNum}>{items?.length ?? 0}</Text> · 上墙{" "}
              <Text style={styles.statsNum}>{approved}</Text> · 收到赞{" "}
              <Text style={styles.statsNum}>{likes}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.listHead}>
          <Text style={styles.listHeadTitle}>我的投稿</Text>
          <Text style={styles.listHeadHint}>按时间倒序</Text>
        </View>

        {items === null && <Text style={styles.loading}>读取中…</Text>}
        {items !== null && items.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>还没投过稿</Text>
            <Text style={styles.emptyHint}>去墙下写一封，投递后这里能看到进度</Text>
          </View>
        )}
        {items?.map((p) => {
          const s = STATUS[p.status] ?? STATUS.pending;
          return (
            <View key={p.id} style={styles.row}>
              <View style={styles.excerpt}>
                <Text style={styles.excerptText} numberOfLines={1}>
                  {p.content}
                </Text>
                <Text style={styles.excerptTime}>{timeAgo(p.createdAt)}</Text>
              </View>
              <View style={[styles.status, { backgroundColor: s.bg }]}>
                <Text style={[styles.statusText, { color: s.fg }]}>{s.label}</Text>
              </View>
            </View>
          );
        })}

        <View style={styles.note}>
          <Text style={styles.noteText}>
            「待审核」通过后会自动上墙；{"\n"}「未通过」的内容只有你自己能看见。
          </Text>
        </View>
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
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  navTitle: {
    fontFamily: fonts.serifSemi,
    fontSize: 18,
    letterSpacing: 2,
    color: colors.ink,
  },
  body: {
    paddingHorizontal: 18,
    paddingBottom: 110,
  },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.vermilionSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarChar: {
    fontFamily: fonts.serifSemi,
    fontSize: 22,
    color: colors.vermilionDeep,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
  },
  stats: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 4,
  },
  statsNum: {
    color: colors.inkSoft,
  },
  listHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingTop: 14,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  listHeadTitle: {
    fontFamily: fonts.serif,
    fontSize: 13,
    letterSpacing: 2,
    color: colors.inkSoft,
  },
  listHeadHint: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  loading: {
    paddingVertical: 24,
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: "center",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyTitle: {
    fontFamily: fonts.serifSemi,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.lineFaint,
  },
  excerpt: {
    flex: 1,
    minWidth: 0,
  },
  excerptText: {
    fontFamily: fonts.serif,
    fontSize: 13.5,
    color: colors.ink,
  },
  excerptTime: {
    fontSize: 10.5,
    color: colors.inkMuted,
    marginTop: 3,
  },
  status: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    letterSpacing: 1,
  },
  note: {
    marginTop: 16,
    borderLeftWidth: 2,
    borderLeftColor: colors.vermilionSoft,
    paddingLeft: 10,
  },
  noteText: {
    fontSize: 11,
    color: colors.inkMuted,
    lineHeight: 19,
  },
});
