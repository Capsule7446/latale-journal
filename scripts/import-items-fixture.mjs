import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { loadItemsRelease } from "../src/load-items.ts";
import { ITEMS_CONTRACT } from "../src/items-contract-lock.ts";

const [sourceDirectory, name = "items-v1"] = process.argv.slice(2);
if (!sourceDirectory || !/^[a-z0-9-]+$/.test(name))
  throw new Error(
    "Usage: node scripts/import-items-fixture.mjs <producer-release-directory> [fixture-name]",
  );
const source = resolve(sourceDirectory);
const target = resolve("tests", "fixtures", name);
const files = new Map();
const release = await loadItemsRelease({
  root: "http://localhost/data/items-v1/",
  contract: ITEMS_CONTRACT,
  fetcher: async (input) => {
    const relative = new URL(input.toString()).pathname.slice(
      "/data/items-v1/".length,
    );
    if (
      !/^(?:current\.json|versions\/[a-f0-9]{64}\/(?:manifest|items)\.json)$/.test(
        relative,
      )
    )
      throw new Error("Invalid package path");
    const bytes = readFileSync(resolve(source, ...relative.split("/")));
    files.set(relative, bytes);
    return new Response(new Uint8Array(bytes));
  },
});
if (release.manifest.coverage.kind !== "producer-test-subset")
  throw new Error("Only producer test subsets belong in committed fixtures");
for (const [relative, bytes] of [...files].sort(
  ([a], [b]) => Number(a === "current.json") - Number(b === "current.json"),
)) {
  const destination = resolve(target, ...relative.split("/"));
  if (
    relative !== "current.json" &&
    existsSync(destination) &&
    !readFileSync(destination).equals(bytes)
  )
    throw new Error(`Immutable fixture differs: ${relative}`);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, bytes);
}
console.log(
  JSON.stringify({
    fixture: name,
    dataVersion: release.manifest.dataVersion,
    coverage: release.manifest.coverage,
    producer: release.manifest.producer,
    items: release.manifest.items,
  }),
);
