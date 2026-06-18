import { request } from "../request";

export type ProviderKind = "openai-compatible" | "anthropic" | "gemini";

// 与后端 toProvider 对齐：不回传明文 key，只回传 hasApiKey。
export interface AiProvider {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  hasApiKey: boolean;
  model: string;
  params: string | null;
  enabled: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProviderPayload {
  name: string;
  kind?: ProviderKind;
  baseUrl: string;
  apiKey?: string | null;
  model: string;
  params?: string | null;
  enabled?: boolean;
  isDefault?: boolean;
}

// 更新：apiKey 省略=不变，传空串=清空。
export type UpdateProviderPayload = Partial<CreateProviderPayload>;

export interface TestProviderPayload {
  id?: string;
  baseUrl?: string;
  apiKey?: string | null;
  model?: string;
}

export interface TestProviderResult {
  ok: boolean;
  models: string[];
}

export interface IcebreakerResult {
  assessment: string;
  angle: string;
  draftMessage: string;
  raw?: string;
  provider: { id: string; name: string; model: string };
}

export const PROVIDER_KIND_LABEL: Record<ProviderKind, string> = {
  "openai-compatible": "OpenAI 兼容",
  anthropic: "Anthropic（预留）",
  gemini: "Gemini（预留）",
};

// AI 域接口。provider 管理需管理员；icebreaker 为 owner 作用域。
export const aiService = {
  listProviders: () =>
    request.get<{ items: AiProvider[] }>("/ai/providers"),
  createProvider: (payload: CreateProviderPayload) =>
    request.post<AiProvider>("/ai/providers", payload),
  updateProvider: (id: string, payload: UpdateProviderPayload) =>
    request.patch<AiProvider>(`/ai/providers/${id}`, payload),
  removeProvider: (id: string) =>
    request.delete<{ ok: boolean }>(`/ai/providers/${id}`),
  testProvider: (payload: TestProviderPayload) =>
    request.post<TestProviderResult>("/ai/providers/test", payload),
  icebreaker: (relationshipId: string) =>
    request.post<IcebreakerResult>(
      `/ai/relationships/${relationshipId}/icebreaker`,
    ),
};
