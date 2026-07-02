import { randomUUID } from "node:crypto";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../index";
import {
  intakeItems,
  type IntakeItemRow,
  type IntakeStatus,
  type NewIntakeItemRow,
} from "../schema";

// 采集条目数据访问层（账号私有暂存区）。见 Memory/DataGovernance.md。
export interface ListParams {
  ownerId: string;
  status?: IntakeStatus;
  page: number;
  pageSize: number;
}

export const intakeRepo = {
  async list({ ownerId, status, page, pageSize }: ListParams) {
    const conds = [eq(intakeItems.ownerId, ownerId)];
    if (status) conds.push(eq(intakeItems.status, status));
    const where = and(...conds);

    const [items, totalRow] = await Promise.all([
      db
        .select()
        .from(intakeItems)
        .where(where)
        .orderBy(desc(intakeItems.capturedAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ value: count() }).from(intakeItems).where(where),
    ]);

    return { items, total: totalRow[0]?.value ?? 0 };
  },

  findById(id: string): Promise<IntakeItemRow | undefined> {
    return db.query.intakeItems.findFirst({ where: eq(intakeItems.id, id) });
  },

  async create(
    data: Pick<NewIntakeItemRow, "ownerId" | "source" | "sourceUrl"> & {
      rawContent: string;
      rawFormat: "text" | "html";
    },
  ): Promise<IntakeItemRow> {
    const now = new Date();
    const [row] = await db
      .insert(intakeItems)
      .values({
        id: randomUUID(),
        ownerId: data.ownerId,
        source: data.source ?? "linkedin",
        sourceUrl: data.sourceUrl ?? null,
        rawContent: data.rawContent,
        rawFormat: data.rawFormat,
        status: "pending",
        capturedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return row;
  },

  async update(
    id: string,
    data: Partial<
      Pick<
        IntakeItemRow,
        "status" | "parsedDraft" | "parseError" | "personId"
      >
    >,
  ): Promise<IntakeItemRow | undefined> {
    const [row] = await db
      .update(intakeItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(intakeItems.id, id))
      .returning();
    return row;
  },

  async remove(id: string): Promise<void> {
    await db.delete(intakeItems).where(eq(intakeItems.id, id));
  },
};
