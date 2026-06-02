import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import errorHandlerPlugin from "./plugins/errorHandler";
import corsPlugin from "./plugins/cors";
import jwtPlugin from "./plugins/jwt";
import swaggerPlugin from "./plugins/swagger";
import { systemRoutes } from "./modules/system/system.routes";
import { authRoutes } from "./modules/auth/auth.routes";

export function buildApp() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

  // 用 Zod 作为校验与序列化的类型来源
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // 横切插件（fastify-plugin 包裹，应用全局生效）
  app.register(errorHandlerPlugin);
  app.register(corsPlugin);
  app.register(jwtPlugin);
  app.register(swaggerPlugin);

  // 业务模块（显式注册，按域聚合）
  app.register(systemRoutes);
  app.register(authRoutes);

  return app;
}

export type AppInstance = ReturnType<typeof buildApp>;
