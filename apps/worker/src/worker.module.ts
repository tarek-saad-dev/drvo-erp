import { Module } from "@nestjs/common";

/**
 * No queues are connected yet. Worker is a standalone DI context only.
 */
@Module({})
export class WorkerModule {}
