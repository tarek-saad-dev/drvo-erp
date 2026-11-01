import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

function readPort(value: string | undefined): number {
  const port = Number(value ?? "3101");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("API_PORT must be an integer between 1 and 65535");
  }
  return port;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: false });
  app.setGlobalPrefix("api");
  app.enableShutdownHooks();
  const host = process.env.API_HOST || "127.0.0.1";
  const port = readPort(process.env.API_PORT);
  await app.listen(port, host);
}

void bootstrap().catch((err: unknown) => {
  console.error("DRVO API startup failed", err);
  process.exitCode = 1;
});
