import fp from "fastify-plugin";
import cors from "@fastify/cors";

export default fp(async (app) => {
  // origin: true 反射任意来源（含 linkedin.com 上的采集脚本）。
  // 放行采集脚本用的自定义头 x-intake-token。见 Memory/DataGovernance.md。
  await app.register(cors, {
    origin: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-intake-token"],
  });
});
