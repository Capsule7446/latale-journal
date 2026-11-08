import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  assertDocument,
  releaseIdentity,
} from "../contracts/items-v1/validate.mjs";
import type { Items, Manifest } from "../contracts/items-v1/types.d.ts";

export const DATA_ROOT = "http://localhost/data/items-v1/";
export const DATA_PREFIX = "/data/items-v1/";
export const sha256 = (bytes: string | Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

// All business fields are copied from the producer's immutable fixture files.
export function readFixture(name = "items-v1") {
  const directory = new URL(`./fixtures/${name}/`, import.meta.url);
  const currentBytes = readFileSync(new URL("current.json", directory));
  const current = assertDocument(
    "pointer",
    JSON.parse(currentBytes.toString("utf8")),
  );
  const manifestBytes = readFileSync(new URL(current.manifest.path, directory));
  const manifest = assertDocument(
    "manifest",
    JSON.parse(manifestBytes.toString("utf8")),
  );
  const itemsPath = new URL(
    manifest.items.path,
    new URL(current.manifest.path, directory),
  );
  const itemsBytes = readFileSync(itemsPath);
  const document = assertDocument(
    "items",
    JSON.parse(itemsBytes.toString("utf8")),
  );
  const files = new Map<string, Buffer>([
    [`${DATA_PREFIX}current.json`, currentBytes],
    [`${DATA_PREFIX}${current.manifest.path}`, manifestBytes],
    [`${DATA_PREFIX}versions/${current.dataVersion}/items.json`, itemsBytes],
  ]);
  return { directory, current, manifest, document, files };
}
export type Fixture = ReturnType<typeof readFixture>;

export function fixtureFetcher(
  files: Map<string, Buffer>,
  requests: string[] = [],
): typeof fetch {
  return async (input, init) => {
    const url = new URL(
      input instanceof Request ? input.url : input.toString(),
    );
    requests.push(url.pathname);
    init?.signal?.throwIfAborted();
    const bytes = files.get(url.pathname);
    return bytes
      ? new Response(new Uint8Array(bytes), {
          headers: { "Content-Type": "application/json" },
        })
      : new Response(null, { status: 404 });
  };
}

// Only negative tests use this: corrupt a producer document, then repair its envelopes
// so the consumer must reject the intended inner schema/identity/coverage violation.
export function invalidPackage(
  source: Fixture,
  mutate: (document: Items, manifest: Manifest) => void,
) {
  const document = structuredClone(source.document);
  const manifest = structuredClone(source.manifest);
  mutate(document, manifest);
  const itemsBytes = Buffer.from(JSON.stringify(document));
  manifest.items = {
    path: "items.json",
    bytes: itemsBytes.byteLength,
    sha256: sha256(itemsBytes),
  };
  manifest.dataVersion = sha256(releaseIdentity(manifest));
  const manifestBytes = Buffer.from(JSON.stringify(manifest));
  const current = {
    ...source.current,
    dataVersion: manifest.dataVersion,
    manifest: {
      path: `versions/${manifest.dataVersion}/manifest.json`,
      bytes: manifestBytes.byteLength,
      sha256: sha256(manifestBytes),
    },
  };
  return new Map([
    [`${DATA_PREFIX}current.json`, Buffer.from(JSON.stringify(current))],
    [`${DATA_PREFIX}${current.manifest.path}`, manifestBytes],
    [`${DATA_PREFIX}versions/${manifest.dataVersion}/items.json`, itemsBytes],
  ]);
}
