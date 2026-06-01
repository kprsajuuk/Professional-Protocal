import { buildApp } from "./app";
import { config } from "./config";

const app = buildApp();

app
  .listen({ port: config.port, host: config.host })
  .then((address) => {
    app.log.info(`Server listening at ${address}`);
    app.log.info(`OpenAPI docs at ${address}/docs`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
