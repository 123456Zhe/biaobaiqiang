import { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import ImageViewing from "react-native-image-viewing";
import { colors, fonts, radius } from "@/lib/tokens";
import { imageUrl, parseImages, timeAgo, type Post } from "@/lib/api";

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

export const PostCard = memo(function PostCard({
  post,
  onLike,
}: {
  post: Post;
  onLike: (id: number) => Promise<number>;
}) {
  const [liked, setLiked] = useState(post.liked ?? false);
  const [count, setCount] = useState(post.likeCount);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const images = parseImages(post.images).slice(0, 4);
  const router = useRouter();
  const viewerImages = images.map((src) => ({ uri: imageUrl(src) }));

  async function handleLike() {
    if (liked) return;
    setLiked(true);
    setCount((c) => c + 1);
    try {
      const n = await onLike(post.id);
      setCount(n);
    } catch {
      setLiked(false);
      setCount((c) => c - 1);
    }
  }

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/post/${post.id}`)}
      android_ripple={{ color: colors.line }}
      accessibilityLabel="查看帖子"
    >
      {post.pinned && (
        <View style={styles.pinBadge}>
          <Text style={styles.pinText}>置 顶</Text>
        </View>
      )}
      {post.target && (
        <View style={styles.to}>
          <Text style={styles.toLabel}>写给 </Text>
          <Text style={styles.toName}>{post.target}</Text>
        </View>
      )}
      <Text style={styles.content}>{post.content}</Text>
      {images.length > 0 && (
        <View style={styles.images}>
          {images.map((src, i) => (
            <Pressable key={i} onPress={() => setViewerIndex(i)}>
              <Image
                source={{ uri: imageUrl(src) }}
                style={[styles.image, images.length === 1 && styles.imageSingle]}
                contentFit="cover"
                recyclingKey={src}
              />
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.footer}>
        <Text style={styles.meta} numberOfLines={1}>
          — {post.author ?? "匿名"} · {timeAgo(post.createdAt)}
        </Text>
        <Pressable
          onPress={handleLike}
          hitSlop={8}
          style={styles.heartWrap}
          accessibilityLabel="点赞"
        >
          <Heart size={13} color={liked ? colors.vermilion : colors.inkMuted} filled={liked} />
          <Text style={[styles.count, liked && styles.heartLikedText]}>
            {count}
          </Text>
        </Pressable>
      </View>
      <ImageViewing
        images={viewerImages}
        imageIndex={viewerIndex ?? 0}
        visible={viewerIndex !== null}
        onRequestClose={() => setViewerIndex(null)}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paperSoft,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
  },
  pinBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.vermilion,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 1,
    marginBottom: 8,
  },
  pinText: {
    color: colors.vermilionDeep,
    fontFamily: fonts.serifSemi,
    fontSize: 10,
    letterSpacing: 1,
  },
  to: {
    flexDirection: "row",
    marginBottom: 8,
  },
  toLabel: {
    fontSize: 11,
    color: colors.inkMuted,
    fontFamily: fonts.serif,
  },
  toName: {
    fontSize: 11,
    color: colors.vermilionDeep,
    fontFamily: fonts.serifSemi,
  },
  content: {
    fontFamily: fonts.serif,
    fontSize: 13.5,
    lineHeight: 26,
    color: colors.ink,
  },
  images: {
    marginTop: 10,
    gap: 8,
  },
  image: {
    width: "100%",
    height: 120,
    borderRadius: radius.photo,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  imageSingle: {
    height: 150,
  },
  footer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  meta: {
    fontSize: 10.5,
    color: colors.inkMuted,
    flexShrink: 1,
  },
  heartWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  count: {
    fontSize: 11,
    color: colors.inkMuted,
    fontVariant: ["tabular-nums"],
  },
  heartLikedText: {
    color: colors.vermilion,
  },
});
