import { z } from "zod";
import type { PersonRow } from "../../db/schema";
import type {
  EducationExperienceJoined,
  WorkExperienceJoined,
} from "../../db/repositories/persons";

// ── 对外表示（映射器）──────────────────────────────────────────────

export function toWorkExperience(row: WorkExperienceJoined) {
  return {
    id: row.id,
    personId: row.personId,
    companyId: row.companyId,
    company: row.companyName,
    title: row.title,
    location: row.location,
    startDate: row.startDate,
    endDate: row.endDate,
    isCurrent: row.isCurrent,
    description: row.description,
  };
}

export function toEducationExperience(row: EducationExperienceJoined) {
  return {
    id: row.id,
    personId: row.personId,
    schoolId: row.schoolId,
    school: row.schoolName,
    department: row.department,
    program: row.program,
    major: row.major,
    startDate: row.startDate,
    endDate: row.endDate,
    isCurrent: row.isCurrent,
    description: row.description,
  };
}

export function toPerson(row: PersonRow) {
  return {
    id: row.id,
    fullName: row.fullName,
    gender: row.gender,
    nationality: row.nationality,
    languages: row.languages,
    birthYear: row.birthYear,
    headline: row.headline,
    linkedinUrl: row.linkedinUrl,
    handshakeUrl: row.handshakeUrl,
    otherLinks: row.otherLinks,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── 响应 schema ───────────────────────────────────────────────────

export const workExperienceSchema = z.object({
  id: z.string(),
  personId: z.string(),
  companyId: z.string(),
  company: z.string(),
  title: z.string().nullable(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
  description: z.string().nullable(),
});

export const educationExperienceSchema = z.object({
  id: z.string(),
  personId: z.string(),
  schoolId: z.string(),
  school: z.string(),
  department: z.string().nullable(),
  program: z.string().nullable(),
  major: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
  description: z.string().nullable(),
});

export const personSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  gender: z.enum(["male", "female", "other"]).nullable(),
  nationality: z.string().nullable(),
  languages: z.string().nullable(),
  birthYear: z.number().nullable(),
  headline: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  handshakeUrl: z.string().nullable(),
  otherLinks: z.string().nullable(),
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const personDetailSchema = personSchema.extend({
  workExperiences: z.array(workExperienceSchema),
  educationExperiences: z.array(educationExperienceSchema),
});

export const listPersonsResponseSchema = z.object({
  items: z.array(personSchema),
  total: z.number(),
});

// ── 入参 schema ───────────────────────────────────────────────────

const optionalText = z.string().trim().max(2000).nullish();

const workExperienceInputSchema = z.object({
  companyName: z.string().trim().min(1, "公司不能为空"),
  title: optionalText,
  location: optionalText,
  startDate: optionalText,
  endDate: optionalText,
  isCurrent: z.boolean().default(false),
  description: optionalText,
});

const educationExperienceInputSchema = z.object({
  schoolName: z.string().trim().min(1, "学校不能为空"),
  department: optionalText,
  program: optionalText,
  major: optionalText,
  startDate: optionalText,
  endDate: optionalText,
  isCurrent: z.boolean().default(false),
  description: optionalText,
});

const personScalarSchema = {
  fullName: z.string().trim().min(1, "姓名不能为空"),
  gender: z.enum(["male", "female", "other"]).nullish(),
  nationality: optionalText,
  languages: optionalText,
  birthYear: z.number().int().min(1900).max(2200).nullish(),
  headline: optionalText,
  linkedinUrl: optionalText,
  handshakeUrl: optionalText,
  otherLinks: optionalText,
};

// 创建/更新均接受嵌套的经历数组（替换式：以传入为准）。
export const createPersonBodySchema = z.object({
  ...personScalarSchema,
  workExperiences: z.array(workExperienceInputSchema).default([]),
  educationExperiences: z.array(educationExperienceInputSchema).default([]),
});

export const updatePersonBodySchema = createPersonBodySchema;

export const listPersonsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  keyword: z.string().trim().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  schoolId: z.string().optional(),
  companyId: z.string().optional(),
  sort: z.enum(["updatedAt", "birthYear"]).default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const personIdParamSchema = z.object({ id: z.string() });

export const okResponseSchema = z.object({ ok: z.boolean() });

export type WorkExperienceInput = z.infer<typeof workExperienceInputSchema>;
export type EducationExperienceInput = z.infer<
  typeof educationExperienceInputSchema
>;
export type CreatePersonBody = z.infer<typeof createPersonBodySchema>;
