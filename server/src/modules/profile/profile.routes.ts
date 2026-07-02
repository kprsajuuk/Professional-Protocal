import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { AppError, NotFoundError } from "../../lib/errors";
import { usersRepo } from "../../db/repositories/users";
import { personsRepo, type PersonDetail } from "../../db/repositories/persons";
import { selfProfilesRepo } from "../../db/repositories/selfProfiles";
import {
  createPersonBodySchema,
  personDetailSchema,
  toEducationExperience,
  toPerson,
  toWorkExperience,
} from "../persons/persons.schema";
import {
  intakeTokenResponseSchema,
  myProfileResponseSchema,
  preferencesSchema,
  toPreferences,
  updatePreferencesBodySchema,
} from "./profile.schema";

function detailDto(detail: PersonDetail) {
  return {
    ...toPerson(detail.person),
    workExperiences: detail.work.map(toWorkExperience),
    educationExperiences: detail.edu.map(toEducationExperience),
  };
}

// 我的资料：账号关联的 Person（事实背景）+ AI 人设/偏好（主观）。见 Memory/AI.md。
export async function profileRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();
  const auth = { onRequest: [app.authenticate] };

  r.get(
    "/me/profile",
    {
      ...auth,
      schema: {
        tags: ["profile"],
        summary: "我的资料（关联 Person + AI 偏好）",
        security: [{ bearerAuth: [] }],
        response: { 200: myProfileResponseSchema },
      },
    },
    async (request) => {
      const me = await usersRepo.findById(request.user.sub);
      const person = me?.personId
        ? ((await personsRepo.getDetail(me.personId)) ?? null)
        : null;
      const prefs = await selfProfilesRepo.findByUser(request.user.sub);
      return {
        personId: me?.personId ?? null,
        person: person ? detailDto(person) : null,
        preferences: toPreferences(prefs),
      };
    },
  );

  // 首次创建「我的 Person」并关联到账号；已关联则引导走 PATCH /persons/:id。
  r.post(
    "/me/profile/person",
    {
      ...auth,
      schema: {
        tags: ["profile"],
        summary: "创建并关联「我的 Person」（仅首次）",
        security: [{ bearerAuth: [] }],
        body: createPersonBodySchema,
        response: { 201: personDetailSchema },
      },
    },
    async (request, reply) => {
      const me = await usersRepo.findById(request.user.sub);
      if (me?.personId) {
        throw new AppError("已关联个人 Person，请通过 PATCH /persons/:id 编辑", 409);
      }
      const personId = await personsRepo.create(request.body, request.user.sub);
      await usersRepo.update(request.user.sub, { personId });
      const detail = await personsRepo.getDetail(personId);
      reply.code(201);
      return detailDto(detail!);
    },
  );

  r.put(
    "/me/preferences",
    {
      ...auth,
      schema: {
        tags: ["profile"],
        summary: "更新我的 AI 人设/偏好（upsert）",
        security: [{ bearerAuth: [] }],
        body: updatePreferencesBodySchema,
        response: { 200: preferencesSchema },
      },
    },
    async (request) => {
      const b = request.body;
      const row = await selfProfilesRepo.upsert(request.user.sub, {
        selfIntro: b.selfIntro ?? null,
        offer: b.offer ?? null,
        lookingFor: b.lookingFor ?? null,
        tonePreference: b.tonePreference ?? null,
        extraContext: b.extraContext ?? null,
      });
      return toPreferences(row)!;
    },
  );

  // ── 采集令牌（供油猴脚本投递鉴权）见 Memory/DataGovernance.md ─────────────────
  r.get(
    "/me/intake-token",
    {
      ...auth,
      schema: {
        tags: ["profile"],
        summary: "查看我的采集令牌",
        security: [{ bearerAuth: [] }],
        response: { 200: intakeTokenResponseSchema },
      },
    },
    async (request) => {
      const me = await usersRepo.findById(request.user.sub);
      return { token: me?.intakeToken ?? null };
    },
  );

  r.post(
    "/me/intake-token/rotate",
    {
      ...auth,
      schema: {
        tags: ["profile"],
        summary: "生成/重置我的采集令牌",
        security: [{ bearerAuth: [] }],
        response: { 200: intakeTokenResponseSchema },
      },
    },
    async (request) => {
      const token = randomBytes(24).toString("base64url");
      await usersRepo.update(request.user.sub, { intakeToken: token });
      return { token };
    },
  );
}
