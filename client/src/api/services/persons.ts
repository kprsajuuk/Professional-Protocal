import { request } from "../request";
import type { PageResult } from "../types";

export type Gender = "male" | "female" | "other";

export interface WorkExperience {
  id: string;
  personId: string;
  company: string;
  title: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
}

export interface EducationExperience {
  id: string;
  personId: string;
  school: string;
  department: string | null;
  program: string | null;
  major: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
}

export interface Person {
  id: string;
  fullName: string;
  gender: Gender | null;
  nationality: string | null;
  languages: string | null;
  birthYear: number | null;
  headline: string | null;
  linkedinUrl: string | null;
  handshakeUrl: string | null;
  otherLinks: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonDetail extends Person {
  workExperiences: WorkExperience[];
  educationExperiences: EducationExperience[];
}

export interface WorkExperienceInput {
  company: string;
  title?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string | null;
}

export interface EducationExperienceInput {
  school: string;
  department?: string | null;
  program?: string | null;
  major?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string | null;
}

export interface PersonPayload {
  fullName: string;
  gender?: Gender | null;
  nationality?: string | null;
  languages?: string | null;
  birthYear?: number | null;
  headline?: string | null;
  linkedinUrl?: string | null;
  handshakeUrl?: string | null;
  otherLinks?: string | null;
  workExperiences: WorkExperienceInput[];
  educationExperiences: EducationExperienceInput[];
}

export interface ListPersonsQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

// 人物库(共享客观资料)接口。
export const personsService = {
  list: (query: ListPersonsQuery) =>
    request.get<PageResult<Person>>("/persons", { params: query }),
  get: (id: string) => request.get<PersonDetail>(`/persons/${id}`),
  create: (payload: PersonPayload) =>
    request.post<PersonDetail>("/persons", payload),
  update: (id: string, payload: PersonPayload) =>
    request.patch<PersonDetail>(`/persons/${id}`, payload),
  remove: (id: string) => request.delete<{ ok: boolean }>(`/persons/${id}`),
};
