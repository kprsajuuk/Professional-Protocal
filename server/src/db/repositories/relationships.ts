import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { db } from "../index";
import {
  interactions,
  persons,
  relationships,
  type RelationshipRow,
  type RelationshipStage,
} from "../schema";
import type { UpdateRelationshipBody } from "../../modules/relationships/relationships.schema";

export interface ListParams {
  ownerId: string;
  page: number;
  pageSize: number;
  keyword?: string;
  stage?: RelationshipStage;
  status?: "active" | "paused" | "archived";
  sort: "updatedAt" | "stage" | "trust" | "lastContact";
  order: "asc" | "desc";
}

export interface RelationshipListRow {
  relationship: RelationshipRow;
  person: { id: string; fullName: string; headline: string | null };
  lastContactedAt: number | null;
}

export const relationshipsRepo = {
  async list({
    ownerId,
    page,
    pageSize,
    keyword,
    stage,
    status,
    sort,
    order,
  }: ListParams) {
    const conds: SQL[] = [eq(relationships.ownerId, ownerId)];
    if (stage) conds.push(eq(relationships.stage, stage));
    if (status) conds.push(eq(relationships.status, status));
    if (keyword) {
      conds.push(
        or(
          like(persons.fullName, `%${keyword}%`),
          like(persons.headline, `%${keyword}%`),
        )!,
      );
    }
    const where = and(...conds);

    // 上次联系时间 = 该关系下互动的 MAX(occurredAt)，派生（见 Memory/Domain.md）。
    const lastContact = db
      .select({
        relationshipId: interactions.relationshipId,
        last: sql<number>`max(${interactions.occurredAt})`.as("last"),
      })
      .from(interactions)
      .groupBy(interactions.relationshipId)
      .as("lc");

    const lastExpr = sql<number | null>`${lastContact.last}`;
    const dir = order === "asc" ? asc : desc;
    const stageOrder = sql`case ${relationships.stage} when 'identified' then 0 when 'connected' then 1 when 'engaged' then 2 when 'trusted' then 3 when 'advocate' then 4 else 99 end`;

    let orderBy: SQL[];
    if (sort === "stage") orderBy = [dir(stageOrder)];
    else if (sort === "trust")
      orderBy = [sql`(${relationships.trustLevel} is null)`, dir(relationships.trustLevel)];
    else if (sort === "lastContact")
      orderBy = [sql`(${lastExpr} is null)`, dir(lastExpr)];
    else orderBy = [dir(relationships.updatedAt)];

    const [rows, totalRow] = await Promise.all([
      db
        .select({
          relationship: relationships,
          person: {
            id: persons.id,
            fullName: persons.fullName,
            headline: persons.headline,
          },
          lastContactedAt: lastExpr,
        })
        .from(relationships)
        .innerJoin(persons, eq(relationships.personId, persons.id))
        .leftJoin(lastContact, eq(relationships.id, lastContact.relationshipId))
        .where(where)
        .orderBy(...orderBy)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({ value: count() })
        .from(relationships)
        .innerJoin(persons, eq(relationships.personId, persons.id))
        .where(where),
    ]);

    return { items: rows as RelationshipListRow[], total: totalRow[0]?.value ?? 0 };
  },

  findById(id: string): Promise<RelationshipRow | undefined> {
    return db.query.relationships.findFirst({
      where: eq(relationships.id, id),
    });
  },

  findByOwnerAndPerson(
    ownerId: string,
    personId: string,
  ): Promise<RelationshipRow | undefined> {
    return db.query.relationships.findFirst({
      where: and(
        eq(relationships.ownerId, ownerId),
        eq(relationships.personId, personId),
      ),
    });
  },

  async create(
    ownerId: string,
    personId: string,
    fields: UpdateRelationshipBody & { stage?: RelationshipStage },
  ): Promise<string> {
    const id = randomUUID();
    const now = new Date();
    await db.insert(relationships).values({
      id,
      ownerId,
      personId,
      stage: fields.stage ?? "identified",
      trustLevel: fields.trustLevel ?? null,
      valueRating: fields.valueRating ?? null,
      referralPotential: fields.referralPotential ?? "unknown",
      context: fields.context ?? null,
      tags: fields.tags ?? null,
      status: fields.status ?? "active",
      understanding: fields.understanding ?? null,
      privateNotes: fields.privateNotes ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },

  async update(id: string, patch: UpdateRelationshipBody): Promise<void> {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) set[key] = value;
    }
    await db.update(relationships).set(set).where(eq(relationships.id, id));
  },

  async remove(id: string): Promise<void> {
    await db.delete(relationships).where(eq(relationships.id, id));
  },
};
