import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000";

export type Post = {
  id: number;
  content: string;
  author: string | null;
  target: string | null;
  images: string;
  likeCount: number;
  liked?: boolean;
  pinned?: boolean;
  createdAt: string;
};

export type Announcement = {
  id: number;
  title: string;
  body: string;
};

export type MyPost = {
  id: number;
  content: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export type PostsPage = {
  items: Post[];
  pinned: Post[];
  announcements: Announcement[];
  nextCursor: number | null;
};

export function imageUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return BASE_URL + path;
}

export function parseImages(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function timeAgo(d: string): string {
  const date = new Date(d);
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day} 天前`;
  return date.toLocaleDateString("zh-CN");
}

let visitorIdCache: string | null = null;

export async function getVisitorId(): Promise<string> {
  if (visitorIdCache) return visitorIdCache;
  const KEY = "visitor-id";
  let id = await AsyncStorage.getItem(KEY);
  if (!id || !/^[a-zA-Z0-9-]{8,64}$/.test(id)) {
    id = Crypto.randomUUID();
    await AsyncStorage.setItem(KEY, id);
  }
  visitorIdCache = id;
  return id;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE_URL + path, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (json as { error?: string; reason?: string }).error ??
        (json as { reason?: string }).reason ??
        "请求失败，请稍后再试",
    );
  }
  return json as T;
}

export async function fetchPosts(cursor?: number | null): Promise<PostsPage> {
  const visitorId = await getVisitorId();
  const q = new URLSearchParams({ take: "20" });
  if (cursor) q.set("cursor", String(cursor));
  return request<PostsPage>(`/api/posts?${q}`, {
    headers: { "x-visitor-id": visitorId },
  });
}

export async function likePost(id: number): Promise<number> {
  const visitorId = await getVisitorId();
  const r = await request<{ likeCount: number }>(`/api/posts/${id}/like`, {
    method: "POST",
    headers: { "x-visitor-id": visitorId },
  });
  return r.likeCount;
}

export type PickedImage = { uri: string; mimeType?: string };

export async function submitPost(input: {
  content: string;
  author: string | null;
  target: string | null;
  images: PickedImage[];
}): Promise<{ id: number; status: string }> {
  const visitorId = await getVisitorId();
  const form = new FormData();
  form.append("content", input.content);
  if (input.author) form.append("author", input.author);
  if (input.target) form.append("target", input.target);
  form.append("visitorId", visitorId);
  for (const [i, img] of input.images.entries()) {
    if (Platform.OS === "web") {
      // web 版拿不到原生文件句柄，uri 是 blob URL，先取回 Blob 再上传
      const blob = await (await fetch(img.uri)).blob();
      form.append("images", blob, `image-${i}.jpg`);
    } else {
      form.append("images", {
        uri: img.uri,
        name: `image-${i}.jpg`,
        type: img.mimeType ?? "image/jpeg",
      } as unknown as Blob);
    }
  }
  return request<{ id: number; status: string }>("/api/posts", {
    method: "POST",
    body: form,
  });
}

export type PostDetail = Post & {
  imageList: string[];
  liked: boolean;
};

export type Comment = {
  id: number;
  name: string | null;
  content: string;
  createdAt: string;
  mine: boolean;
};

export async function fetchPostDetail(id: number): Promise<{
  post: PostDetail;
  comments: Comment[];
}> {
  const visitorId = await getVisitorId();
  return request<{ post: PostDetail; comments: Comment[] }>(`/api/posts/${id}`, {
    headers: { "x-visitor-id": visitorId },
  });
}

export async function addComment(
  id: number,
  content: string,
  name: string | null,
): Promise<{ id: number; status: string }> {
  const visitorId = await getVisitorId();
  return request<{ id: number; status: string }>(`/api/posts/${id}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-visitor-id": visitorId },
    body: JSON.stringify({ content, name, visitorId }),
  });
}

export async function fetchMyPosts(): Promise<MyPost[]> {
  const visitorId = await getVisitorId();
  const r = await request<{ items: MyPost[] }>(
    `/api/posts/mine?visitorId=${encodeURIComponent(visitorId)}`,
  );
  return r.items;
}
