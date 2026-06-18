import { AppError } from "../../lib/errors";
import type { PersonDetail } from "../../db/repositories/persons";
import type {
  InteractionRow,
  RelationshipRow,
  SelfProfileRow,
} from "../../db/schema";

// OpenAI 兼容客户端 + 破冰建议的上下文组装。见 Memory/AI.md。
// v1 只实现 OpenAI 兼容 Chat Completions（本地 Ollama/OpenWebUI/OpenAI 等都讲这套）。

export interface ProviderConfig {
  baseUrl: string;
  apiKey?: string | null;
  model: string;
  params?: string | null; // JSON 文本，如 {"temperature":0.7}
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const DEFAULT_TIMEOUT_MS = 60_000;

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function authHeaders(apiKey?: string | null): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey && apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`;
  return headers;
}

function parseParams(params?: string | null): Record<string, unknown> {
  if (!params) return {};
  try {
    const obj = JSON.parse(params) as unknown;
    return obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new AppError(`无法连接模型端点：${reason}`, 502);
  } finally {
    clearTimeout(timer);
  }
}

// 探活：列出端点可用模型（OpenAI 兼容 GET /models）。供「测试连接」用。
export async function listModels(config: ProviderConfig): Promise<string[]> {
  const res = await fetchWithTimeout(
    joinUrl(config.baseUrl, "models"),
    { method: "GET", headers: authHeaders(config.apiKey) },
    15_000,
  );
  if (!res.ok) {
    throw new AppError(
      `端点返回 ${res.status}：${(await res.text()).slice(0, 200)}`,
      502,
    );
  }
  const body = (await res.json()) as { data?: Array<{ id?: string }> };
  return (body.data ?? []).map((m) => m.id ?? "").filter(Boolean);
}

export async function chatCompletion(
  config: ProviderConfig,
  messages: ChatMessage[],
): Promise<string> {
  const extra = parseParams(config.params);
  const res = await fetchWithTimeout(joinUrl(config.baseUrl, "chat/completions"), {
    method: "POST",
    headers: authHeaders(config.apiKey),
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: false,
      ...extra,
    }),
  });
  if (!res.ok) {
    throw new AppError(
      `模型调用失败 ${res.status}：${(await res.text()).slice(0, 300)}`,
      502,
    );
  }
  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new AppError("模型返回为空", 502);
  return content;
}

// ── 破冰建议：上下文组装 + prompt ─────────────────────────────────────

export interface IcebreakerContext {
  me: PersonDetail | null;
  myPreferences: SelfProfileRow | null;
  target: PersonDetail;
  relationship: RelationshipRow;
  interactions: InteractionRow[];
}

export interface IcebreakerResult {
  assessment: string; // 现在该破冰还是再观察 + 理由
  angle: string; // 切入角度 / 身份
  draftMessage: string; // 首条消息草稿
  raw?: string; // 解析失败时的原始输出
}

const STAGE_LABEL: Record<string, string> = {
  identified: "已识别（尚未建联）",
  connected: "已建联",
  engaged: "互动中",
  trusted: "信任建立",
  advocate: "可引荐",
};

function personText(detail: PersonDetail | null, who: string): string {
  if (!detail) return `${who}：（暂无资料）`;
  const p = detail.person;
  const lines = [`${who}：${p.fullName}`];
  if (p.headline) lines.push(`  一句话：${p.headline}`);
  if (p.nationality) lines.push(`  国籍：${p.nationality}`);
  if (p.languages) lines.push(`  语言：${p.languages}`);
  for (const w of detail.work) {
    lines.push(
      `  工作：${w.companyName}${w.title ? ` · ${w.title}` : ""}${
        w.isCurrent ? "（在职）" : ""
      }`,
    );
  }
  for (const e of detail.edu) {
    lines.push(
      `  教育：${e.schoolName}${e.program ? ` · ${e.program}` : ""}${
        e.major ? ` · ${e.major}` : ""
      }`,
    );
  }
  return lines.join("\n");
}

function preferencesText(prefs: SelfProfileRow | null): string {
  if (!prefs) return "我的偏好：（未填写）";
  const lines: string[] = ["我的偏好/人设："];
  if (prefs.selfIntro) lines.push(`  定位：${prefs.selfIntro}`);
  if (prefs.offer) lines.push(`  我能带来：${prefs.offer}`);
  if (prefs.lookingFor) lines.push(`  我在找：${prefs.lookingFor}`);
  if (prefs.tonePreference) lines.push(`  语气偏好：${prefs.tonePreference}`);
  if (prefs.extraContext) lines.push(`  其他背景：${prefs.extraContext}`);
  return lines.length > 1 ? lines.join("\n") : "我的偏好：（未填写）";
}

function relationshipText(
  rel: RelationshipRow,
  interactions: InteractionRow[],
): string {
  const lines = [
    `关系阶段（我的主观判断，可能有误）：${STAGE_LABEL[rel.stage] ?? rel.stage}`,
  ];
  if (rel.context) lines.push(`相识背景：${rel.context}`);
  if (rel.understanding) lines.push(`我对他的当前理解：${rel.understanding}`);
  if (interactions.length === 0) {
    lines.push("互动历史：（还没有任何互动——这通常意味着要破冰）");
  } else {
    lines.push("互动历史（事实，最近在前）：");
    for (const it of interactions.slice(0, 12)) {
      const when = it.occurredAt.toISOString().slice(0, 10);
      lines.push(
        `  - ${when} [${it.channel}${it.direction ? `/${it.direction}` : ""}] ${it.summary}`,
      );
    }
  }
  return lines.join("\n");
}

const SYSTEM_PROMPT = [
  "你是一个 networking 破冰顾问，帮助一位理工科背景、不擅长社交的用户与目标联系人建立长期关系。",
  "牢记以下铁律：",
  "1. 你的产出是「建议与草稿」，绝不是事实；你不评定关系分数、不臆测对方好感度。",
  "2. 基于给定的事实（双方资料 + 互动史）给建议，不要编造不存在的共同点或经历。",
  "3. 目标是降低开口的难度，措辞真诚、具体、不谄媚、不油腻；尊重对方时间。",
  "4. 若信息不足或现在不宜贸然破冰，要诚实地说「建议再观察」并说明原因。",
  "",
  "请只输出一个 JSON 对象，不要额外解释，格式：",
  '{"assessment":"现在该破冰还是再观察，以及简短理由","angle":"建议的切入角度/身份（如校友/同行/共同项目）","draftMessage":"一条可直接发出的首条消息草稿（贴合语气偏好与对方背景）"}',
].join("\n");

export function buildIcebreakerMessages(ctx: IcebreakerContext): ChatMessage[] {
  const user = [
    personText(ctx.me, "【我】"),
    preferencesText(ctx.myPreferences),
    "",
    personText(ctx.target, "【对方】"),
    "",
    relationshipText(ctx.relationship, ctx.interactions),
    "",
    "请据此给出破冰建议与首条消息草稿（JSON）。",
  ].join("\n");
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
}

// 宽松解析：优先抽取首个 JSON 对象；失败则整段回退到 draftMessage。
export function parseIcebreaker(content: string): IcebreakerResult {
  const match = content.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]) as Partial<IcebreakerResult>;
      if (obj.assessment || obj.angle || obj.draftMessage) {
        return {
          assessment: obj.assessment ?? "",
          angle: obj.angle ?? "",
          draftMessage: obj.draftMessage ?? "",
        };
      }
    } catch {
      // 落到回退分支
    }
  }
  return {
    assessment: "",
    angle: "",
    draftMessage: content.trim(),
    raw: content.trim(),
  };
}

export async function generateIcebreaker(
  config: ProviderConfig,
  ctx: IcebreakerContext,
): Promise<IcebreakerResult> {
  const content = await chatCompletion(config, buildIcebreakerMessages(ctx));
  return parseIcebreaker(content);
}
