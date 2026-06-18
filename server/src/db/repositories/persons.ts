import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, inArray, like, ne, or, sql } from "drizzle-orm";
import { db } from "../index";
import {
  companies,
  educationExperiences,
  persons,
  schools,
  workExperiences,
  type EducationExperienceRow,
  type PersonRow,
  type WorkExperienceRow,
} from "../schema";
import { companiesRepo, schoolsRepo } from "./lookups";
import type {
  CreatePersonBody,
  EducationExperienceInput,
  WorkExperienceInput,
} from "../../modules/persons/persons.schema";

export type WorkExperienceJoined = WorkExperienceRow & { companyName: string };
export type EducationExperienceJoined = EducationExperienceRow & {
  schoolName: string;
};

export interface ListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  gender?: "male" | "female" | "other";
  schoolId?: string;
  companyId?: string;
  excludeId?: string; // 排除某条人物（用于过滤掉「我自己」）
  sort: "updatedAt" | "birthYear";
  order: "asc" | "desc";
}

export interface PersonDetail {
  person: PersonRow;
  work: WorkExperienceJoined[];
  edu: EducationExperienceJoined[];
}

const n = <T>(v: T | null | undefined): T | null => v ?? null;

function workValues(personId: string, w: WorkExperienceInput, companyId: string) {
  return {
    id: randomUUID(),
    personId,
    companyId,
    title: n(w.title),
    location: n(w.location),
    startDate: n(w.startDate),
    endDate: n(w.endDate),
    isCurrent: w.isCurrent,
    description: n(w.description),
  };
}

function eduValues(
  personId: string,
  e: EducationExperienceInput,
  schoolId: string,
) {
  return {
    id: randomUUID(),
    personId,
    schoolId,
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

// 把工作/教育经历的公司名/学校名解析为实体 id（find-or-create，事务前完成）。
async function resolveWork(input: CreatePersonBody, userId: string) {
  return Promise.all(
    input.workExperiences.map(async (w) => ({
      input: w,
      companyId: await companiesRepo.findOrCreate(w.companyName, userId),
    })),
  );
}
async function resolveEdu(input: CreatePersonBody, userId: string) {
  return Promise.all(
    input.educationExperiences.map(async (e) => ({
      input: e,
      schoolId: await schoolsRepo.findOrCreate(e.schoolName, userId),
    })),
  );
}

export const personsRepo = {
  async list({
    page,
    pageSize,
    keyword,
    gender,
    schoolId,
    companyId,
    excludeId,
    sort,
    order,
  }: ListParams) {
    const conds = [];
    if (excludeId) conds.push(ne(persons.id, excludeId));
    if (keyword) {
      conds.push(
        or(
          like(persons.fullName, `%${keyword}%`),
          like(persons.headline, `%${keyword}%`),
        )!,
      );
    }
    if (gender) conds.push(eq(persons.gender, gender));
    if (companyId) {
      conds.push(
        inArray(
          persons.id,
          db
            .select({ id: workExperiences.personId })
            .from(workExperiences)
            .where(
              and(
                eq(workExperiences.companyId, companyId),
                eq(workExperiences.isCurrent, true),
              ),
            ),
        ),
      );
    }
    if (schoolId) {
      conds.push(
        inArray(
          persons.id,
          db
            .select({ id: educationExperiences.personId })
            .from(educationExperiences)
            .where(eq(educationExperiences.schoolId, schoolId)),
        ),
      );
    }
    const where = conds.length ? and(...conds) : undefined;

    const dir = order === "asc" ? asc : desc;
    const orderBy =
      sort === "birthYear"
        ? [sql`(${persons.birthYear} is null)`, dir(persons.birthYear)]
        : [dir(persons.updatedAt)];

    const [items, totalRow] = await Promise.all([
      db
        .select()
        .from(persons)
        .where(where)
        .orderBy(...orderBy)
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
    const [workRows, eduRows] = await Promise.all([
      db
        .select({ we: workExperiences, companyName: companies.name })
        .from(workExperiences)
        .innerJoin(companies, eq(workExperiences.companyId, companies.id))
        .where(eq(workExperiences.personId, id)),
      db
        .select({ ee: educationExperiences, schoolName: schools.name })
        .from(educationExperiences)
        .innerJoin(schools, eq(educationExperiences.schoolId, schools.id))
        .where(eq(educationExperiences.personId, id)),
    ]);
    return {
      person,
      work: workRows.map((r) => ({ ...r.we, companyName: r.companyName })),
      edu: eduRows.map((r) => ({ ...r.ee, schoolName: r.schoolName })),
    };
  },

  async create(input: CreatePersonBody, userId: string): Promise<string> {
    const workResolved = await resolveWork(input, userId);
    const eduResolved = await resolveEdu(input, userId);
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
      for (const { input: w, companyId } of workResolved) {
        tx.insert(workExperiences).values(workValues(personId, w, companyId)).run();
      }
      for (const { input: e, schoolId } of eduResolved) {
        tx.insert(educationExperiences)
          .values(eduValues(personId, e, schoolId))
          .run();
      }
    });
    return personId;
  },

  // 替换式更新：人物标量字段更新；经历整体以传入数组为准（删旧插新）。
  async update(id: string, input: CreatePersonBody, userId: string): Promise<void> {
    const workResolved = await resolveWork(input, userId);
    const eduResolved = await resolveEdu(input, userId);
    const now = new Date();
    db.transaction((tx) => {
      tx.update(persons)
        .set({ ...scalarValues(input), updatedBy: userId, updatedAt: now })
        .where(eq(persons.id, id))
        .run();
      tx.delete(workExperiences).where(eq(workExperiences.personId, id)).run();
      tx.delete(educationExperiences)
        .where(eq(educationExperiences.personId, id))
        .run();
      for (const { input: w, companyId } of workResolved) {
        tx.insert(workExperiences).values(workValues(id, w, companyId)).run();
      }
      for (const { input: e, schoolId } of eduResolved) {
        tx.insert(educationExperiences).values(eduValues(id, e, schoolId)).run();
      }
    });
  },

  async remove(id: string): Promise<void> {
    await db.delete(persons).where(eq(persons.id, id));
  },
};
