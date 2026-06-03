import { randomUUID } from "node:crypto";
import { count, desc, eq, like, or } from "drizzle-orm";
import { db } from "../index";
import {
  educationExperiences,
  persons,
  workExperiences,
  type EducationExperienceRow,
  type PersonRow,
  type WorkExperienceRow,
} from "../schema";
import type {
  CreatePersonBody,
  EducationExperienceInput,
  WorkExperienceInput,
} from "../../modules/persons/persons.schema";

export interface ListParams {
  page: number;
  pageSize: number;
  keyword?: string;
}

export interface PersonDetail {
  person: PersonRow;
  work: WorkExperienceRow[];
  edu: EducationExperienceRow[];
}

const n = <T>(v: T | null | undefined): T | null => v ?? null;

function workValues(personId: string, w: WorkExperienceInput) {
  return {
    id: randomUUID(),
    personId,
    company: w.company,
    title: n(w.title),
    location: n(w.location),
    startDate: n(w.startDate),
    endDate: n(w.endDate),
    isCurrent: w.isCurrent,
    description: n(w.description),
  };
}

function eduValues(personId: string, e: EducationExperienceInput) {
  return {
    id: randomUUID(),
    personId,
    school: e.school,
    department: n(e.department),
    program: n(e.program),
    major: n(e.major),
    startDate: n(e.startDate),
    endDate: n(e.endDate),
    isCurrent: e.isCurrent,
    description: n(e.description),
  };
}

function scalarValues(input: CreatePersonBody) {
  return {
    fullName: input.fullName,
    gender: n(input.gender),
    nationality: n(input.nationality),
    languages: n(input.languages),
    birthYear: n(input.birthYear),
    headline: n(input.headline),
    linkedinUrl: n(input.linkedinUrl),
    handshakeUrl: n(input.handshakeUrl),
    otherLinks: n(input.otherLinks),
  };
}

export const personsRepo = {
  async list({ page, pageSize, keyword }: ListParams) {
    const where = keyword
      ? or(
          like(persons.fullName, `%${keyword}%`),
          like(persons.headline, `%${keyword}%`),
        )
      : undefined;

    const [items, totalRow] = await Promise.all([
      db
        .select()
        .from(persons)
        .where(where)
        .orderBy(desc(persons.updatedAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ value: count() }).from(persons).where(where),
    ]);

    return { items, total: totalRow[0]?.value ?? 0 };
  },

  findById(id: string): Promise<PersonRow | undefined> {
    return db.query.persons.findFirst({ where: eq(persons.id, id) });
  },

  async getDetail(id: string): Promise<PersonDetail | undefined> {
    const person = await db.query.persons.findFirst({
      where: eq(persons.id, id),
    });
    if (!person) return undefined;
    const [work, edu] = await Promise.all([
      db
        .select()
        .from(workExperiences)
        .where(eq(workExperiences.personId, id)),
      db
        .select()
        .from(educationExperiences)
        .where(eq(educationExperiences.personId, id)),
    ]);
    return { person, work, edu };
  },

  create(input: CreatePersonBody, userId: string): string {
    const personId = randomUUID();
    const now = new Date();
    db.transaction((tx) => {
      tx.insert(persons)
        .values({
          id: personId,
          ...scalarValues(input),
          createdBy: userId,
          updatedBy: userId,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      for (const w of input.workExperiences) {
        tx.insert(workExperiences).values(workValues(personId, w)).run();
      }
      for (const e of input.educationExperiences) {
        tx.insert(educationExperiences).values(eduValues(personId, e)).run();
      }
    });
    return personId;
  },

  // 替换式更新：人物标量字段更新；经历整体以传入数组为准（删旧插新）。
  update(id: string, input: CreatePersonBody, userId: string): void {
    const now = new Date();
    db.transaction((tx) => {
      tx.update(persons)
        .set({ ...scalarValues(input), updatedBy: userId, updatedAt: now })
        .where(eq(persons.id, id))
        .run();
      tx.delete(workExperiences)
        .where(eq(workExperiences.personId, id))
        .run();
      tx.delete(educationExperiences)
        .where(eq(educationExperiences.personId, id))
        .run();
      for (const w of input.workExperiences) {
        tx.insert(workExperiences).values(workValues(id, w)).run();
      }
      for (const e of input.educationExperiences) {
        tx.insert(educationExperiences).values(eduValues(id, e)).run();
      }
    });
  },

  async remove(id: string): Promise<void> {
    await db.delete(persons).where(eq(persons.id, id));
  },
};
