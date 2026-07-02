import { request } from "../request";
import type { PersonDetail, PersonPayload } from "./persons";

export interface MyPreferences {
  selfIntro: string | null;
  offer: string | null;
  lookingFor: string | null;
  tonePreference: string | null;
  extraContext: string | null;
}

export interface MyProfile {
  personId: string | null;
  person: PersonDetail | null;
  preferences: MyPreferences | null;
}

export type UpdatePreferencesPayload = Partial<MyPreferences>;

export interface IntakeTokenResult {
  token: string | null;
}

// 我的资料：关联 Person（事实背景）+ AI 人设/偏好（主观）。见 Memory/AI.md。
export const profileService = {
  get: () => request.get<MyProfile>("/me/profile"),
  // 首次创建并关联「我的 Person」；已关联则改用 personsService.update。
  createPerson: (payload: PersonPayload) =>
    request.post<PersonDetail>("/me/profile/person", payload),
  updatePreferences: (payload: UpdatePreferencesPayload) =>
    request.put<MyPreferences>("/me/preferences", payload),
  // 采集令牌（供油猴脚本投递鉴权）。见 Memory/DataGovernance.md。
  getIntakeToken: () => request.get<IntakeTokenResult>("/me/intake-token"),
  rotateIntakeToken: () =>
    request.post<IntakeTokenResult>("/me/intake-token/rotate"),
};
