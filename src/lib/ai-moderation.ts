const API_KEY = process.env.OPENAI_API_KEY ?? "";
const BASE_URL = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const TIMEOUT_MS = Number(process.env.OPENAI_MODERATION_TIMEOUT_MS ?? 15000) || 15000;

export type AiVerdict = "approved" | "rejected" | "uncertain" | "error";

export interface AiModerationResult {
  verdict: AiVerdict;
  reason: string;
}

const SYSTEM_PROMPT = `你是校园表白墙的内容审核员。请审核给定的文本内容，判断是否允许发布。
判定标准：
- approved：正常内容，包括表白、祝福、寻人、日常分享等
- rejected：包含色情低俗、辱骂人身攻击、政治敏感、暴力恐怖、赌博诈骗、广告引流、泄露他人隐私（如电话、住址）等内容
- uncertain：擦边、难以判断或可能违规但不确定的内容
只输出 JSON，格式：{"verdict": "approved" | "rejected" | "uncertain", "reason": "简短的中文理由"}，reason 不超过 50 字。`;

export async function moderateText(text: string): Promise<AiModerationResult> {
  if (!API_KEY) {
    return { verdict: "error", reason: "未配置 AI 审核服务" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
    });
    if (!res.ok) {
      return { verdict: "error", reason: `AI 审核接口返回 ${res.status}` };
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as { verdict?: string; reason?: string };
    const verdict =
      parsed.verdict === "approved" || parsed.verdict === "rejected"
        ? parsed.verdict
        : "uncertain";
    return { verdict, reason: String(parsed.reason ?? "").slice(0, 200) || "无理由" };
  } catch (e) {
    const reason =
      e instanceof Error && e.name === "AbortError"
        ? "AI 审核请求超时"
        : e instanceof Error
          ? `AI 审核请求失败：${e.message}`
          : "AI 审核请求失败";
    return { verdict: "error", reason };
  } finally {
    clearTimeout(timer);
  }
}
