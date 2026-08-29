type Trie = { children: Map<string, Trie>; end: boolean };

const root: Trie = { children: new Map(), end: false };

export function loadWords(words: string[]) {
  root.children.clear();
  for (const w of words) {
    const word = w.trim().toLowerCase();
    if (!word) continue;
    let node = root;
    for (const ch of word) {
      let next = node.children.get(ch);
      if (!next) {
        next = { children: new Map(), end: false };
        node.children.set(ch, next);
      }
      node = next;
    }
    node.end = true;
  }
}

export function match(text: string): { hit: boolean; word?: string } {
  const lower = text.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    let node: Trie | undefined = root.children.get(lower[i]);
    if (!node) continue;
    for (let j = i; j < lower.length && node; j++) {
      if (node.end) return { hit: true, word: lower.slice(i, j + 1) };
      node = node.children.get(lower[j + 1]);
    }
  }
  return { hit: false };
}

const cache = new Map<string, string[]>();
let cachedWords: string[] | null = null;

export async function checkText(text: string): Promise<{ hit: boolean; word?: string }> {
  if (!cachedWords) {
    const { prisma } = await import("./db");
    cachedWords = (await prisma.sensitiveWord.findMany()).map((w) => w.word);
    loadWords(cachedWords);
  }
  const cached = cache.get(text);
  if (cached !== undefined) {
    if (cached.length === 0) return { hit: false };
    return { hit: true, word: cached[0] };
  }
  const r = match(text);
  cache.set(text, r.word ? [r.word] : []);
  if (cache.size > 5000) cache.clear();
  return r;
}

export async function reloadWords() {
  cachedWords = null;
  cache.clear();
  await checkText("");
}
