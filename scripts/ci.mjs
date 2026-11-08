import { execFileSync } from 'node:child_process';

for (const args of [['scripts/check.mjs'], ['--test', 'scripts/policy.test.mjs']]) {
  execFileSync(process.execPath, args, { stdio: 'inherit' });
}
