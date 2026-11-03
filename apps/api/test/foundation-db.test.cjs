const test = require("node:test");
const assert = require("node:assert/strict");
const { FoundationDatabaseService } = require("../dist/data/foundation-database.service.js");
const { DatabaseHealthController } = require("../dist/data/database-health.controller.js");

test("K4B SQL data plane remains off without explicit enable flag", async () => {
  const old = process.env.DRVO_SQL_ENABLED;
  try {
    delete process.env.DRVO_SQL_ENABLED;
    const service = new FoundationDatabaseService();
    await service.onModuleInit();
    await assert.rejects(() => service.checkReadiness(), /DRVO SQL is not ready/);
    await service.onModuleDestroy();
  } finally {
    if (old === undefined) delete process.env.DRVO_SQL_ENABLED;
    else process.env.DRVO_SQL_ENABLED = old;
  }
});

test("K4B database health controller delegates to service without exposing data", async () => {
  const expected = { status: "ok", service: "drvo-api", database: "ready" };
  const controller = new DatabaseHealthController({ checkReadiness: async () => expected });
  assert.deepEqual(await controller.getHealth(), expected);
});
