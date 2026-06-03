import { buildApp } from "./app";
import { config } from "./config";
import { bootstrapDatabase } from "./db/bootstrap";

const app = buildApp();

async function start() {
  await bootstrapDatabase(app.log);
  const address = await app.listen({ port: config.port, host: config.host });
  app.log.info(`Server listening at ${address}`);
  app.log.info(`OpenAPI docs at ${address}/docs`);
}

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
