const test = require('node:test');
const assert = require('node:assert/strict');
const { ModuleCandidatesService } = require('../dist/modules/module-candidates.service');

const id = (n) => n.toString(16).padStart(8,'0') + '-0000-4000-8000-000000000001';
const actor = {
  tenantId: id(1), accountId: id(2), username: 'unit.ci',
  sessionVersion: 1, mustChangePassword: false,
};
const token = 'A'.repeat(43);

test('candidate API service is disabled by default before any DB access', async () => {
  const previous = process.env.DRVO_K6C_CATALOG_READ_ENABLED;
  try {
    delete process.env.DRVO_K6C_CATALOG_READ_ENABLED;
    const service = new ModuleCandidatesService({
      getInternalPool(){ throw Error('must not connect'); },
    });
    await assert.rejects(() => service.read(actor,token,id(3),id(4)),
      e => e.getStatus?.() === 503);
  } finally {
    if (previous === undefined) delete process.env.DRVO_K6C_CATALOG_READ_ENABLED;
    else process.env.DRVO_K6C_CATALOG_READ_ENABLED = previous;
  }
});

test('invalid branch / actor / temporary session cannot reach SQL', async () => {
  const prevAuth=process.env.DRVO_K5_AUTH_ENABLED;
  const prevCatalog=process.env.DRVO_K6C_CATALOG_READ_ENABLED;
  process.env.DRVO_K5_AUTH_ENABLED='YES';
  process.env.DRVO_K6C_CATALOG_READ_ENABLED='YES';
  try {
    const service = new ModuleCandidatesService({
      getInternalPool(){ throw Error('must not connect'); },
    });
    for (const [a,t,b,br] of [
      [actor,token,'bad-business',id(4)],
      [actor,'invalid',id(3),id(4)],
      [{...actor,mustChangePassword:true},token,id(3),id(4)],
      [{...actor,sessionVersion:0},token,id(3),id(4)],
      [{...actor,tenantId:'spoof'},token,id(3),id(4)],
    ]) {
      await assert.rejects(() => service.read(a,t,b,br),
        e => e.getStatus?.() === 404);
    }
  } finally {
    if(prevAuth===undefined)delete process.env.DRVO_K5_AUTH_ENABLED;
    else process.env.DRVO_K5_AUTH_ENABLED=prevAuth;
    if(prevCatalog===undefined)delete process.env.DRVO_K6C_CATALOG_READ_ENABLED;
    else process.env.DRVO_K6C_CATALOG_READ_ENABLED=prevCatalog;
  }
});

test('unexpected database failures are sanitized; scope denials look like 404', async () => {
  const prevAuth=process.env.DRVO_K5_AUTH_ENABLED;
  const prevCatalog=process.env.DRVO_K6C_CATALOG_READ_ENABLED;
  process.env.DRVO_K5_AUTH_ENABLED='YES';
  process.env.DRVO_K6C_CATALOG_READ_ENABLED='YES';
  try {
    const fake = (error) => new ModuleCandidatesService({
      getInternalPool:()=>({
        request:()=>({
          input(){return this;},
          async execute(){throw error;},
        }),
      }),
    });
    await assert.rejects(() => fake({number:51091}).read(actor,token,id(3),id(4)),
      e => e.getStatus?.() === 404);
    await assert.rejects(() => fake(new Error('secret SQL connection detail'))
      .read(actor,token,id(3),id(4)),
      e => e.getStatus?.() === 503 && !e.message.includes('secret'));
  } finally {
    if(prevAuth===undefined)delete process.env.DRVO_K5_AUTH_ENABLED;
    else process.env.DRVO_K5_AUTH_ENABLED=prevAuth;
    if(prevCatalog===undefined)delete process.env.DRVO_K6C_CATALOG_READ_ENABLED;
    else process.env.DRVO_K6C_CATALOG_READ_ENABLED=prevCatalog;
  }
});
