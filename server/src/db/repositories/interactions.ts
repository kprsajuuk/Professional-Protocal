import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "../index";
import { interactions, type InteractionRow } from "../schema";
import type {
  CreateInteractionBody,
  UpdateInteractionBody,
} from "../../modules/interactions/interactions.schema";

export const interactionsRepo = {
  listByRelationship(relationshipId: string): Promise<InteractionRow[]> {
    return db
      .select()
      .from(interactions)
      .where(eq(interactions.relationshipId, relationshipId))
      .orderBy(desc(interactions.occurredAt));
  },

  findById(id: string): Promise<InteractionRow | undefined> {
    return db.query.interactions.findFirst({
      where: eq(interactions.id, id),
    });
  },

  async create(
    relationshipId: string,
    ownerId: string,
    body: CreateInteractionBody,
  ): Promise<InteractionRow> {
    const now = new Date();
    const [row] = await db
      .insert(interactions)
      .values({
        id: randomUUID(),
        relationshipId,
        ownerId,
        occurredAt: body.occurredAt,
        channel: body.channel,
        direction: body.direction ?? null,
        summary: body.summary,
        learned: body.learned ?? null,
        nextStep: body.nextStep ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return row;
  },

  async update(
    id: string,
    patch: UpdateInteractionBody,
  ): Promise<InteractionRow | undefined> {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) set[key] = value;
    }
    const [row] = await db
      .update(interactions)
      .set(set)
      .where(eq(interactions.id, id))
      .returning();
    return row;
  },

  async remove(id: string): Promise<void> {
    await db.delete(interactions).where(eq(interactions.id, id));
  },
};
