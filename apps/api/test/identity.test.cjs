const test = require("node:test");
const assert = require("node:assert/strict");
const { hashNewPassword, verifyPassword, dummyPasswordCheck } = require("../dist/identity/password");
const { IdentityService, extractSessionCookie, K5_COOKIE_NAME } = require("../dist/identity/identity.service");

test("salted scrypt password hashing is randomized and verifies without storing plaintext", async () => {
  const password = "Correct Horse Battery 123!✓";
  const first = await hashNewPassword(password);
  const second = await hashNewPassword(password);
  assert.equal(first.algorithm, "scrypt-v1");
  assert.equal(first.salt.length, 32);
  assert.equal(first.passwordHash.length, 64);
  assert.notDeepEqual(first.salt, second.salt);
  assert.notDeepEqual(first.passwordHash, second.passwordHash);
  assert.equal(await verifyPassword(password,first.salt,first.passwordHash,first.algorithm),true);
  assert.equal(await verifyPassword(password + "x",first.salt,first.passwordHash,first.algorithm),false);
  assert.equal(await verifyPassword(password,first.salt,first.passwordHash,"unrecognized"),false);
  await dummyPasswordCheck("irrelevant");
});

test("password constraints reject insecure inputs", async () => {
  await assert.rejects(() => hashNewPassword("short"));
  await assert.rejects(() => hashNewPassword("x".repeat(257)));
});

test("session cookie parser rejects duplicates, oversized tokens and malformed values", () => {
  const token = "A".repeat(43);
  assert.equal(extractSessionCookie(K5_COOKIE_NAME+"="+token),token);
  assert.equal(extractSessionCookie("foo=bar; "+K5_COOKIE_NAME+"="+token),token);
  assert.equal(extractSessionCookie(K5_COOKIE_NAME+"="+token+"; "+K5_COOKIE_NAME+"="+token),null);
  assert.equal(extractSessionCookie(K5_COOKIE_NAME+"=not-valid"),null);
  assert.equal(extractSessionCookie("foo=bar"),null);
});

test("identity service cannot open login or role paths when not explicitly enabled", async () => {
  const old = process.env.DRVO_K5_AUTH_ENABLED;
  try {
    delete process.env.DRVO_K5_AUTH_ENABLED;
    const identity = new IdentityService({ getInternalPool(){ throw new Error("pool must not be used"); } });
    await assert.rejects(() => identity.login("user","LongPassword123!"), /Identity is not enabled/);
    await assert.rejects(() => identity.actorFromToken(null), /Identity is not enabled/);
  } finally {
    if(old === undefined) delete process.env.DRVO_K5_AUTH_ENABLED;
    else process.env.DRVO_K5_AUTH_ENABLED=old;
  }
});
