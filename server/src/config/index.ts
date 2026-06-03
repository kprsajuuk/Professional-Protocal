export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "0.0.0.0",
  databaseUrl: process.env.DATABASE_URL ?? "./data.sqlite",
  jwt: {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  },
  // 初始管理员：首次启动且用户表为空时，自动播种这一个内置管理员账号。
  seedAdmin: {
    username: process.env.SEED_ADMIN_USERNAME ?? "admin",
    password: process.env.SEED_ADMIN_PASSWORD ?? "admin",
  },
};

export type AppConfig = typeof config;
