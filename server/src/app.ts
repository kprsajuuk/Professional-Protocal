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
import { usersRoutes } from "./modules/users/users.routes";
import { lookupsRoutes } from "./modules/lookups/lookups.routes";
import { personsRoutes } from "./modules/persons/persons.routes";
import { relationshipsRoutes } from "./modules/relationships/relationships.routes";
import { interactionsRoutes } from "./modules/interactions/interactions.routes";
import { aiRoutes } from "./modules/ai/ai.routes";
import { profileRoutes } from "./modules/profile/profile.routes";

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
  app.register(usersRoutes);
  app.register(lookupsRoutes);
  app.register(personsRoutes);
  app.register(relationshipsRoutes);
  app.register(interactionsRoutes);
  app.register(aiRoutes);
  app.register(profileRoutes);

  return app;
}

export type AppInstance = ReturnType<typeof buildApp>;
