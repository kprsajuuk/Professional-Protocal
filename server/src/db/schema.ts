// Drizzle schema：字段与类型的唯一事实来源（见 ../../../Memory/Conventions.md）。
//
// 核心业务领域模型见 ../../../Memory/Domain.md（双层模型：客观人物 / 账号私有关系）。
import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
};

// 用户表：登录与访问控制的基础。角色仅 admin / user 两类（见 Memory/AccessControl.md）。
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull().default(""),
  email: text("email"),
  role: text("role", { enum: ["admin", "user"] })
    .notNull()
    .default("user"),
  // scrypt 派生结果，格式 `salt:hash`（十六进制），见 lib/password.ts。
  passwordHash: text("password_hash").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type UserRole = (typeof users.$inferSelect)["role"];
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

// ── 核心业务：双层模型（见 Memory/Domain.md）────────────────────────────

// 客观层：人物（共享、可协作编辑）。
export const persons = sqliteTable("persons", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  gender: text("gender", { enum: ["male", "female", "other"] }),
  nationality: text("nationality"),
  languages: text("languages"),
  birthYear: integer("birth_year"),
  headline: text("headline"),
  linkedinUrl: text("linkedin_url"),
  handshakeUrl: text("handshake_url"),
  otherLinks: text("other_links"),
  // 审计：谁建的、谁最后改的（共享数据的协作留痕）。
  createdBy: text("created_by").references(() => users.id),
  updatedBy: text("updated_by").references(() => users.id),
  ...timestamps,
});

// 客观层：规范化的公司 / 学校实体（共享，find-or-create，见 Memory/Domain.md）。
export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdBy: text("created_by").references(() => users.id),
  ...timestamps,
});

export const schools = sqliteTable("schools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdBy: text("created_by").references(() => users.id),
  ...timestamps,
});

// 客观层：工作经历（属于 person，可多条；公司引用 companies 实体）。
export const workExperiences = sqliteTable("work_experiences", {
  id: text("id").primaryKey(),
  personId: text("person_id")
    .notNull()
    .references(() => persons.id, { onDelete: "cascade" }),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id),
  title: text("title"),
  location: text("location"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
  description: text("description"),
  ...timestamps,
});

// 客观层：教育经历（属于 person，可多条；学校引用 schools 实体）。
export const educationExperiences = sqliteTable("education_experiences", {
  id: text("id").primaryKey(),
  personId: text("person_id")
    .notNull()
    .references(() => persons.id, { onDelete: "cascade" }),
  schoolId: text("school_id")
    .notNull()
    .references(() => schools.id),
  department: text("department"),
  program: text("program"),
  major: text("major"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
  description: text("description"),
  ...timestamps,
});

// 主观层：关系（账号私有）。(ownerId, personId) 唯一。
export const relationships = sqliteTable(
  "relationships",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    stage: text("stage", {
      enum: ["identified", "connected", "engaged", "trusted", "advocate"],
    })
      .notNull()
      .default("identified"),
    trustLevel: integer("trust_level"),
    valueRating: integer("value_rating"),
    referralPotential: text("referral_potential", {
      enum: ["unknown", "unlikely", "possible", "likely"],
    })
      .notNull()
      .default("unknown"),
    context: text("context"),
    tags: text("tags"),
    status: text("status", { enum: ["active", "paused", "archived"] })
      .notNull()
      .default("active"),
    understanding: text("understanding"),
    privateNotes: text("private_notes"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("relationships_owner_person_idx").on(
      table.ownerId,
      table.personId,
    ),
  ],
);

// 主观层：互动时间线（属于 relationship，账号私有；owner 冗余便于鉴权过滤）。
export const interactions = sqliteTable("interactions", {
  id: text("id").primaryKey(),
  relationshipId: text("relationship_id")
    .notNull()
    .references(() => relationships.id, { onDelete: "cascade" }),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
  channel: text("channel", {
    enum: [
      "linkedin",
      "email",
      "message",
      "call",
      "meeting",
      "event",
      "referral",
      "other",
    ],
  })
    .notNull()
    .default("other"),
  direction: text("direction", { enum: ["outbound", "inbound", "mutual"] }),
  summary: text("summary").notNull(),
  learned: text("learned"),
  nextStep: text("next_step"),
  ...timestamps,
});

export type PersonRow = typeof persons.$inferSelect;
export type NewPersonRow = typeof persons.$inferInsert;
export type CompanyRow = typeof companies.$inferSelect;
export type SchoolRow = typeof schools.$inferSelect;
export type WorkExperienceRow = typeof workExperiences.$inferSelect;
export type NewWorkExperienceRow = typeof workExperiences.$inferInsert;
export type EducationExperienceRow = typeof educationExperiences.$inferSelect;
export type NewEducationExperienceRow = typeof educationExperiences.$inferInsert;
export type RelationshipRow = typeof relationships.$inferSelect;
export type NewRelationshipRow = typeof relationships.$inferInsert;
export type RelationshipStage = RelationshipRow["stage"];
export type InteractionRow = typeof interactions.$inferSelect;
export type NewInteractionRow = typeof interactions.$inferInsert;
