import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// K0-only guard for obvious forbidden imports, not a production static analyzer.
const root = fileURLToPath(new URL('../', import.meta.url));
const kernelDir = join(root, 'packages/kernel/src');
const forbidden = /(?:from\s*['"]|import\s*\(['"])[^'"]*(?:apps\/|modules\/|\/db\/|\/infrastructure\/)/;
let checked = 0;
for (const file of readdirSync(kernelDir)) {
  if (!file.endsWith('.ts')) continue;
  const src = readFileSync(join(kernelDir, file), 'utf8');
  if (forbidden.test(src)) throw new Error('Kernel boundary violation: ' + file);
  checked++;
}
if (!checked) throw new Error('No kernel source files found');
console.log('Kernel boundary guard checked ' + checked + ' TypeScript files');
