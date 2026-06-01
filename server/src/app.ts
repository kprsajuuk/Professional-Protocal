import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { healthRoutes } from "./routes/health";

export function buildApp() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

  // 用 Zod 作为校验与序列化的类型来源
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(cors, { origin: true });

  // 由 Zod schema 自动生成 OpenAPI（见 Memory/Conventions.md：接口靠生成）
  app.register(swagger, {
    openapi: {
      info: {
        title: "Professional-Protocal API",
        description: "长期人脉关系经营系统 后端 API",
        version: "0.1.0",
      },
    },
    transform: jsonSchemaTransform,
  });
  app.register(swaggerUi, { routePrefix: "/docs" });

  // 业务路由
  app.register(healthRoutes);

  return app;
}

export type AppInstance = ReturnType<typeof buildApp>;
