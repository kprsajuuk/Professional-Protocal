import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

// 由 Zod schema 自动生成 OpenAPI（见 Memory/Conventions.md：接口靠生成）。
export default fp(async (app) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Professional-Protocal API",
        description: "长期人脉关系经营系统 后端 API",
        version: "0.1.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, { routePrefix: "/docs" });
});
