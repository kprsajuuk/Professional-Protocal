import { randomUUID } from "node:crypto";
import { desc, eq, ne } from "drizzle-orm";
import { db } from "../index";
import {
  aiProviders,
  type AiProviderRow,
  type NewAiProviderRow,
} from "../schema";

// 模型端点数据访问层（全局，admin 管）。见 Memory/AI.md。
export const aiProvidersRepo = {
  list(): Promise<AiProviderRow[]> {
    return db.select().from(aiProviders).orderBy(desc(aiProviders.createdAt));
  },

  findById(id: string): Promise<AiProviderRow | undefined> {
    return db.query.aiProviders.findFirst({ where: eq(aiProviders.id, id) });
  },

  // AI 功能调用时选用的端点：优先 isDefault 且 enabled，否则任一 enabled。
  async findActive(): Promise<AiProviderRow | undefined> {
    const def = await db.query.aiProviders.findFirst({
      where: eq(aiProviders.isDefault, true),
    });
    if (def?.enabled) return def;
    return db.query.aiProviders.findFirst({
      where: eq(aiProviders.enabled, true),
    });
  },

  async create(
    data: Omit<NewAiProviderRow, "id" | "createdAt" | "updatedAt">,
  ): Promise<AiProviderRow> {
    const now = new Date();
    const id = randomUUID();
    const [row] = await db
      .insert(aiProviders)
      .values({ ...data, id, createdAt: now, updatedAt: now })
      .returning();
    // 设为默认时，清掉其它默认标记（保证唯一默认）。
    if (row.isDefault) await this.clearOtherDefaults(id);
    return row;
  },

  async update(
    id: string,
    data: Partial<
      Pick<
        AiProviderRow,
        | "name"
        | "kind"
        | "baseUrl"
        | "apiKey"
        | "model"
        | "params"
        | "enabled"
        | "isDefault"
      >
    >,
  ): Promise<AiProviderRow | undefined> {
    const [row] = await db
      .update(aiProviders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(aiProviders.id, id))
      .returning();
    if (row?.isDefault) await this.clearOtherDefaults(id);
    return row;
  },

  async remove(id: string): Promise<void> {
    await db.delete(aiProviders).where(eq(aiProviders.id, id));
  },

  async clearOtherDefaults(keepId: string): Promise<void> {
    await db
      .update(aiProviders)
      .set({ isDefault: false })
      .where(ne(aiProviders.id, keepId));
  },
};
