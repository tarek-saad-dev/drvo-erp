const test = require("node:test");
const assert = require("node:assert/strict");
const { HealthController } = require("../dist/health.controller.js");

test("API liveness response does not claim business readiness", () => {
  assert.deepEqual(new HealthController().getHealth(), {
    status: "ok",
    service: "drvo-api",
    mode: "scaffold",
  });
});
