import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../index";
import { selfProfiles, type SelfProfileRow } from "../schema";

export type SelfProfileFields = Partial<
  Pick<
    SelfProfileRow,
    "selfIntro" | "offer" | "lookingFor" | "tonePreference" | "extraContext"
  >
>;

// 我的 AI 人设/偏好（账号私有，一行/用户）。见 Memory/AI.md。
export const selfProfilesRepo = {
  findByUser(userId: string): Promise<SelfProfileRow | undefined> {
    return db.query.selfProfiles.findFirst({
      where: eq(selfProfiles.userId, userId),
    });
  },

  // upsert：有则更新，无则插入。
  async upsert(
    userId: string,
    fields: SelfProfileFields,
  ): Promise<SelfProfileRow> {
    const existing = await this.findByUser(userId);
    const now = new Date();
    if (existing) {
      const [row] = await db
        .update(selfProfiles)
        .set({ ...fields, updatedAt: now })
        .where(eq(selfProfiles.userId, userId))
        .returning();
      return row;
    }
    const [row] = await db
      .insert(selfProfiles)
      .values({
        id: randomUUID(),
        userId,
        ...fields,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return row;
  },
};
