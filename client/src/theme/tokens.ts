import type { ThemeConfig } from "antd";

// 项目级主题 token（明暗共用，如品牌色、圆角）。
// 明/暗的具体呈现由 ConfigProvider 的 algorithm 控制（见 ThemeContext）。
export const baseToken: ThemeConfig["token"] = {
  colorPrimary: "#1677ff",
  borderRadius: 6,
};
