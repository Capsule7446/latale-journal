import { execFileSync } from "node:child_process";

for (const args of [
  ["contracts/items-v1/build.mjs", "--check"],
  ["scripts/check-items-contract.mjs"],
  ["scripts/check.mjs"],
  [
    "--test",
    "scripts/policy.test.mjs",
    "tests/catalog.test.ts",
    "tests/routes.test.ts",
    "tests/load-items.test.ts",
  ],
  ["node_modules/typescript/bin/tsc", "--noEmit"],
  ["node_modules/vite/bin/vite.js", "build"],
]) {
  execFileSync(process.execPath, args, { stdio: "inherit" });
}
