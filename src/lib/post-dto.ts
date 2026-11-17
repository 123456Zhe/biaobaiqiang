import { safeJsonArray } from "@/lib/format";

// 公开接口的投稿字段白名单：只返回展示所需字段。
// 内部标识（openId / visitorId / wechatNo / source / aiVerdict / aiReason）
// 绝不能随公开列表或详情泄露——visitorId 一旦公开，任何人都能关联
// 同一用户的多次投稿。
export type PostRow = {
  id: number;
  content: string;
  author: string | null;
  target: string | null;
  tag: string | null;
  images: string;
  likeCount: number;
  pinned: boolean;
  createdAt: Date;
};

export type PublicPost = {
  id: number;
  content: string;
  author: string | null;
  target: string | null;
  tag: string | null;
  images: string;
  likeCount: number;
  pinned: boolean;
  createdAt: Date;
  imageList: string[];
  liked: boolean;
};

export function toPublicPost(p: PostRow, liked: boolean): PublicPost {
  return {
    id: p.id,
    content: p.content,
    author: p.author,
    target: p.target,
    tag: p.tag,
    images: p.images,
    likeCount: p.likeCount,
    pinned: p.pinned,
    createdAt: p.createdAt,
    imageList: safeJsonArray(p.images),
    liked,
  };
}
