import { z } from "zod";
import type { SelfProfileRow } from "../../db/schema";
import { personDetailSchema } from "../persons/persons.schema";

export function toPreferences(row: SelfProfileRow | undefined | null) {
  if (!row) return null;
  return {
    selfIntro: row.selfIntro,
    offer: row.offer,
    lookingFor: row.lookingFor,
    tonePreference: row.tonePreference,
    extraContext: row.extraContext,
  };
}

export const preferencesSchema = z.object({
  selfIntro: z.string().nullable(),
  offer: z.string().nullable(),
  lookingFor: z.string().nullable(),
  tonePreference: z.string().nullable(),
  extraContext: z.string().nullable(),
});

export const myProfileResponseSchema = z.object({
  personId: z.string().nullable(),
  person: personDetailSchema.nullable(),
  preferences: preferencesSchema.nullable(),
});

const optionalText = z.string().trim().max(4000).nullish();

export const updatePreferencesBodySchema = z.object({
  selfIntro: optionalText,
  offer: optionalText,
  lookingFor: optionalText,
  tonePreference: optionalText,
  extraContext: optionalText,
});

export type UpdatePreferencesBody = z.infer<typeof updatePreferencesBodySchema>;
