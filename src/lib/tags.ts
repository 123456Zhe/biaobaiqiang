export const TAGS = ["表白", "寻物", "吐槽", "交友", "其他"] as const;

export type Tag = (typeof TAGS)[number];

export function isTag(v: string): v is Tag {
  return (TAGS as readonly string[]).includes(v);
}
