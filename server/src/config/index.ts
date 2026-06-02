export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "0.0.0.0",
  databaseUrl: process.env.DATABASE_URL ?? "./data.sqlite",
  jwt: {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  },
  // 占位登录凭据：真实用户表接入前，仅供开发期 stub 登录使用。
  auth: {
    username: process.env.AUTH_USERNAME ?? "admin",
    password: process.env.AUTH_PASSWORD ?? "admin",
  },
};

export type AppConfig = typeof config;
