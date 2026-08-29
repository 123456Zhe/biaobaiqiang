import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "./db";

let seeded = false;

export async function seedSensitiveWords() {
  if (seeded) return;
  seeded = true;
  const count = await prisma.sensitiveWord.count();
  if (count > 0) return;
  const file = path.join(process.cwd(), "words", "default.json");
  const data = JSON.parse(await fs.readFile(file, "utf8"));
  await prisma.sensitiveWord.createMany({ data: data.map((word: string) => ({ word })) });
}
