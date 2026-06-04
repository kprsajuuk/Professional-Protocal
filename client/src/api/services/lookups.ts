import { request } from "../request";

export interface LookupItem {
  id: string;
  name: string;
}

// 公司 / 学校查找(供 AutoComplete / 筛选下拉使用)。
export const companiesService = {
  search: (keyword?: string) =>
    request.get<{ items: LookupItem[] }>("/companies", {
      params: { keyword: keyword || undefined },
    }),
};

export const schoolsService = {
  search: (keyword?: string) =>
    request.get<{ items: LookupItem[] }>("/schools", {
      params: { keyword: keyword || undefined },
    }),
};
