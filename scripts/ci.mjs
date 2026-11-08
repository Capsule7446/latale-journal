import { execFileSync } from 'node:child_process';

for (const args of [['scripts/check.mjs'], ['--test', 'scripts/policy.test.mjs', 'tests/catalog.test.ts', 'tests/routes.test.ts'], ['node_modules/typescript/bin/tsc', '--noEmit'], ['node_modules/vite/bin/vite.js', 'build']]) {
  execFileSync(process.execPath, args, { stdio: 'inherit' });
}
