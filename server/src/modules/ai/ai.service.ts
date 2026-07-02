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

// ── 采集解析：原文 → Person 草稿 ─────────────────────────────────────
// AI 从原文抽出的只是「待确认草稿」，缺失留空、绝不编造。见 Memory/DataGovernance.md。

export interface PersonDraftWork {
  companyName: string;
  title: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
}

export interface PersonDraftEdu {
  schoolName: string;
  department: string | null;
  program: string | null;
  major: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
}

// 对齐 createPersonBodySchema 的形状，供前端预填表单。
export interface PersonDraft {
  fullName: string;
  gender: "male" | "female" | "other" | null;
  nationality: string | null;
  languages: string | null;
  birthYear: number | null;
  headline: string | null;
  linkedinUrl: string | null;
  handshakeUrl: string | null;
  otherLinks: string | null;
  workExperiences: PersonDraftWork[];
  educationExperiences: PersonDraftEdu[];
}

const PARSE_SYSTEM_PROMPT = [
  "你是一个信息抽取器，任务是从用户粘贴的联系人原始资料（多为 LinkedIn 个人页文本）中，抽取结构化的人物信息。",
  "铁律：",
  "1. 只抽取原文中明确出现的信息；任何拿不准或原文没有的字段，一律留空（字符串用 null，数组用 []）。绝不编造、绝不脑补。",
  "2. birthYear 只在原文明确给出出生年份时才填，否则 null（不要从年龄/入学年反推）。",
  "3. gender 只在原文明确可判定时填 male/female/other，否则 null。",
  "4. 工作/教育经历尽量抽全，每条至少要有公司名/学校名；抽不到公司名或学校名的条目直接丢弃。",
  "",
  "请只输出一个 JSON 对象，不要额外解释、不要 markdown 代码块，格式：",
  '{"fullName":"","gender":null,"nationality":null,"languages":null,"birthYear":null,"headline":"一句话头衔/标题","linkedinUrl":null,"handshakeUrl":null,"otherLinks":null,',
  '"workExperiences":[{"companyName":"","title":null,"location":null,"startDate":null,"endDate":null,"isCurrent":false,"description":null}],',
  '"educationExperiences":[{"schoolName":"","department":null,"program":null,"major":null,"startDate":null,"endDate":null,"isCurrent":false,"description":null}]}',
].join("\n");

function buildParsePersonMessages(
  rawText: string,
  sourceUrl?: string | null,
): ChatMessage[] {
  const user = [
    sourceUrl ? `来源 URL：${sourceUrl}` : "",
    "以下是联系人原始资料，请抽取成上述 JSON：",
    "---",
    rawText,
    "---",
  ]
    .filter(Boolean)
    .join("\n");
  return [
    { role: "system", content: PARSE_SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
}

const str = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
};

function coerceWork(v: unknown): PersonDraftWork | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const companyName = str(o.companyName);
  if (!companyName) return null;
  return {
    companyName,
    title: str(o.title),
    location: str(o.location),
    startDate: str(o.startDate),
    endDate: str(o.endDate),
    isCurrent: o.isCurrent === true,
    description: str(o.description),
  };
}

function coerceEdu(v: unknown): PersonDraftEdu | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const schoolName = str(o.schoolName);
  if (!schoolName) return null;
  return {
    schoolName,
    department: str(o.department),
    program: str(o.program),
    major: str(o.major),
    startDate: str(o.startDate),
    endDate: str(o.endDate),
    isCurrent: o.isCurrent === true,
    description: str(o.description),
  };
}

// 宽松解析：抽首个 JSON 对象并逐字段消毒；无法解析则抛错（由调用方存 parseError）。
export function parsePersonDraft(content: string): PersonDraft {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new AppError("模型未返回可解析的 JSON", 502);
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    throw new AppError("模型返回的 JSON 无法解析", 502);
  }
  const gender = str(obj.gender);
  const birthYear =
    typeof obj.birthYear === "number" && Number.isFinite(obj.birthYear)
      ? Math.trunc(obj.birthYear)
      : null;
  const work = Array.isArray(obj.workExperiences)
    ? obj.workExperiences.map(coerceWork).filter((w): w is PersonDraftWork => !!w)
    : [];
  const edu = Array.isArray(obj.educationExperiences)
    ? obj.educationExperiences.map(coerceEdu).filter((e): e is PersonDraftEdu => !!e)
    : [];
  return {
    fullName: str(obj.fullName) ?? "",
    gender:
      gender === "male" || gender === "female" || gender === "other"
        ? gender
        : null,
    nationality: str(obj.nationality),
    languages: str(obj.languages),
    birthYear: birthYear && birthYear >= 1900 && birthYear <= 2200 ? birthYear : null,
    headline: str(obj.headline),
    linkedinUrl: str(obj.linkedinUrl),
    handshakeUrl: str(obj.handshakeUrl),
    otherLinks: str(obj.otherLinks),
    workExperiences: work,
    educationExperiences: edu,
  };
}

export async function parsePersonFromRaw(
  config: ProviderConfig,
  rawText: string,
  sourceUrl?: string | null,
): Promise<PersonDraft> {
  const content = await chatCompletion(
    config,
    buildParsePersonMessages(rawText, sourceUrl),
  );
  return parsePersonDraft(content);
}
