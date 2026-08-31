// 设计 token：与网页端 globals.css 的 oklch 一一对应（已换算为 sRGB hex）
export const colors = {
  paper: "#fcfaf6",
  paperSoft: "#f3eee6",
  ink: "#221812",
  inkSoft: "#5b544f",
  inkMuted: "#8a8581",
  line: "#e1ddd8",
  lineFaint: "rgba(225, 221, 216, 0.6)",
  vermilion: "#d45b3d",
  vermilionSoft: "#fddcd1",
  vermilionDeep: "#ba2e17",
  moss: "#49a46e",
  mossSoft: "#e2f1e6",
  mossDeep: "#156f41",
  amber: "#eba941",
  amberSoft: "#fbe9c6",
  amberDeep: "#a76c12",
  crimson: "#e64343",
  crimsonSoft: "#fbe1dc",
  white: "#ffffff",
} as const;

export const fonts = {
  serif: "NotoSerifSC_400Regular",
  serifSemi: "NotoSerifSC_600SemiBold",
} as const;

export const radius = {
  card: 12,
  photo: 8,
  seal: 10,
  chip: 6,
} as const;
