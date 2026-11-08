import test from "node:test";
import assert from "node:assert/strict";
import { ITEMS_CONTRACT } from "../src/items-contract-lock.ts";
import { ItemsLoadError, loadItemsRelease } from "../src/load-items.ts";
import {
  DATA_PREFIX,
  DATA_ROOT,
  fixtureFetcher,
  invalidPackage,
  readFixture,
  sha256,
} from "./fixture-package.ts";

const fixture = readFixture();
const load = (files = fixture.files, signal?: AbortSignal) =>
  loadItemsRelease({
    root: DATA_ROOT,
    contract: ITEMS_CONTRACT,
    signal,
    fetcher: fixtureFetcher(files),
  });
const rejects = (files: Map<string, Buffer>, code: string) =>
  assert.rejects(
    load(files),
    (error: unknown) => error instanceof ItemsLoadError && error.code === code,
  );

test("real producer fixture is accepted byte-for-byte with its frozen identity and coverage", async () => {
  const requests: string[] = [];
  const release = await loadItemsRelease({
    root: DATA_ROOT,
    contract: ITEMS_CONTRACT,
    fetcher: fixtureFetcher(fixture.files, requests),
  });
  assert.deepEqual(release.items, fixture.document.items);
  assert.deepEqual(release.manifest, fixture.manifest);
  assert.equal(release.manifest.coverage.kind, "producer-test-subset");
  assert.deepEqual(
    release.items.map((item) => item.id),
    release.manifest.coverage.selection,
  );
  assert.equal(requests.length, 3);
  assert.equal(requests[0], `${DATA_PREFIX}current.json`);
});

test("invalid roots and HTTP errors do not become unconnected or valid empty data", async () => {
  await assert.rejects(
    loadItemsRelease({ root: "file:///private/", contract: ITEMS_CONTRACT }),
    { code: "configuration" },
  );
  await rejects(new Map(), "request");
});

test("external pointer paths and retired format versions fail before manifest download", async () => {
  for (const change of [
    { ...fixture.current, formatVersion: "unsupported" },
    {
      ...fixture.current,
      manifest: {
        ...fixture.current.manifest,
        path: "https://invalid.example/items.json",
      },
    },
  ]) {
    const files = new Map(fixture.files);
    files.set(
      `${DATA_PREFIX}current.json`,
      Buffer.from(JSON.stringify(change)),
    );
    await rejects(files, "document");
  }
});

test("manifest and items must match both declared byte length and byte SHA-256", async () => {
  for (const path of [
    fixture.current.manifest.path,
    `versions/${fixture.current.dataVersion}/items.json`,
  ]) {
    for (const change of ["short", "long", "same-length"] as const) {
      const files = new Map(fixture.files);
      const original = files.get(`${DATA_PREFIX}${path}`)!;
      const damaged = Buffer.from(original);
      damaged[0] ^= 1;
      files.set(
        `${DATA_PREFIX}${path}`,
        change === "short"
          ? original.subarray(1)
          : change === "long"
            ? Buffer.concat([original, Buffer.from(" ")])
            : damaged,
      );
      await rejects(files, "integrity");
    }
  }
});

test("contract commit and content hash are independently trusted", async () => {
  for (const field of ["sourceCommit", "sha256"] as const) {
    await rejects(
      invalidPackage(fixture, (_, manifest) => {
        manifest.contract[field] = "0".repeat(
          field === "sourceCommit" ? 40 : 64,
        );
      }),
      "contract",
    );
  }
});

test("a rehashed manifest still cannot change its release identity", async () => {
  const manifest = structuredClone(fixture.manifest);
  manifest.producer.commit = "0".repeat(40);
  const bytes = Buffer.from(JSON.stringify(manifest));
  const current = structuredClone(fixture.current);
  current.manifest.bytes = bytes.byteLength;
  current.manifest.sha256 = sha256(bytes);
  const files = new Map(fixture.files);
  files.set(`${DATA_PREFIX}current.json`, Buffer.from(JSON.stringify(current)));
  files.set(`${DATA_PREFIX}${current.manifest.path}`, bytes);
  await rejects(files, "version");
});

test("coverage counts, selection membership and selection order must match actual records", async () => {
  assert.ok(fixture.document.items.length > 1);
  await rejects(
    invalidPackage(fixture, (_, manifest) => {
      manifest.coverage.count += 1;
      manifest.coverage.selection.push(manifest.coverage.selection[0]);
    }),
    "document",
  );
  await rejects(
    invalidPackage(fixture, (_, manifest) => {
      manifest.coverage.selection.reverse();
    }),
    "coverage",
  );
  await rejects(
    invalidPackage(fixture, (_, manifest) => {
      manifest.coverage.kind = "full-public";
      manifest.coverage.count += 1;
      manifest.coverage.fullPublicCount = manifest.coverage.count;
      manifest.coverage.selection = [];
    }),
    "coverage",
  );
});

test("schema failures reject the whole package without inventing replacement values", async () => {
  await rejects(
    invalidPackage(fixture, (document) => {
      document.items[0].description.status =
        document.items[0].description.status === "success"
          ? "missing"
          : "success";
    }),
    "document",
  );
  await rejects(
    invalidPackage(fixture, (document) => {
      document.items[1].id = document.items[0].id;
    }),
    "document",
  );
});

test("cancelled loads remain cancelled", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(load(fixture.files, controller.signal), {
    name: "AbortError",
  });
});

test("the same consumer accepts two independently generated compatible real releases", async () => {
  const second = readFixture("items-v1-b");
  const original = await load();
  const updated = await load(second.files);
  assert.notEqual(original.manifest.dataVersion, updated.manifest.dataVersion);
  assert.deepEqual(updated.items, second.document.items);
  assert.deepEqual(original.items, fixture.document.items);
});
