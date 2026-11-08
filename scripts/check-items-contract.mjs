import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { ITEMS_CONTRACT } from "../src/items-contract-lock.ts";

const files = [
  "schema.json",
  "validate.mjs",
  "validate.d.mts",
  "types.d.ts",
  "README.md",
  "build.mjs",
].sort();
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const inventory = files
  .map((name) => {
    const file = `contracts/items-v1/${name}`;
    const bytes = readFileSync(file);
    const frozen = execFileSync("git", [
      "show",
      `${ITEMS_CONTRACT.sourceCommit}:${file}`,
    ]);
    if (!bytes.equals(frozen))
      throw new Error(`Contract differs from frozen source commit: ${name}`);
    return `${hash(bytes)}  ${name}\n`;
  })
  .join("");
if (hash(inventory) !== ITEMS_CONTRACT.sha256)
  throw new Error("Trusted contract content identity mismatch");
console.log(
  `items-v1 contract verified: ${ITEMS_CONTRACT.sourceCommit} / ${ITEMS_CONTRACT.sha256}`,
);
