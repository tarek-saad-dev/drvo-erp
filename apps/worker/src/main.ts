import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    abortOnError: false,
  });
  // Process shutdown is handled here to avoid duplicate signal hooks.

  // Infrastructure heartbeat only, not evidence of processing any jobs.
  console.info("DRVO worker process started (idle; no jobs configured)");
  const heartbeat = setInterval(() => {
    console.info("DRVO worker idle heartbeat");
  }, 60_000);

  let closing = false;
  const shutdown = async (): Promise<void> => {
    if (closing) return;
    closing = true;
    clearInterval(heartbeat);
    await app.close();
  };
  process.once("SIGTERM", () => { void shutdown(); });
  process.once("SIGINT", () => { void shutdown(); });
}

void bootstrap().catch((error: unknown) => {
  console.error("DRVO worker failed to start", error);
  process.exitCode = 1;
});
