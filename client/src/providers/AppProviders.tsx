import { App as AntdApp, ConfigProvider, theme as antdTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ThemeProvider } from "../context/ThemeContext";
import { AuthProvider } from "../context/AuthContext";
import { useTheme } from "../hooks/useTheme";
import { baseToken } from "../theme/tokens";
import { queryClient } from "./queryClient";

// 读取主题模式并应用 antd 明/暗算法。
function ThemedConfig({ children }: { children: ReactNode }) {
  const { mode } = useTheme();
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm:
          mode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: baseToken,
      }}
    >
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}

// 聚合全应用的 Provider：主题 → antd 配置 → react-query → 鉴权。
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ThemedConfig>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      </ThemedConfig>
    </ThemeProvider>
  );
}
