import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  categoryTree,
  filterItems,
  pageState,
  rangeError,
} from "../src/catalog.ts";
import type { DemoPackage } from "../src/demo-model.ts";

const data: DemoPackage = JSON.parse(
  fs.readFileSync(
    new URL("../public/demo/items.json", import.meta.url),
    "utf8",
  ),
);
const find = (query: string) =>
  filterItems(data.items, new URLSearchParams(query));
const ids = (query: string) => find(query).map((item) => item.id);

test("fixtures remain explicitly fictional and references point to separate versions", () => {
  assert.equal(data.kind, "visual-demo");
  assert.equal(
    new Set(data.items.map((item) => item.id)).size,
    data.items.length,
  );
  for (const item of data.items)
    for (const id of item.versions || [])
      assert.ok(data.items.some((candidate) => candidate.id === id));
});
test("normal and awakened initial forms remain separate; initial form must match filters itself", () => {
  assert.deepEqual(ids("q=练习剑"), ["91000001", "91000003"]);
  assert.deepEqual(ids("q=练习剑&lvmin=120"), []);
  assert.deepEqual(ids("q=练习剑&lvmin=120&initial=0"), ["91000002"]);
  assert.deepEqual(ids("q=91000002"), ["91000002"]);
  assert.deepEqual(ids("q=星光练习剑+%2B1"), ["91000002", "91000004"]);
});
test("numeric IDs match exactly, NFKC normalization works and duplicates retain identity", () => {
  assert.deepEqual(ids("q=910000"), []);
  assert.deepEqual(ids("q= ９１０００００２ "), ["91000002"]);
  assert.deepEqual(ids("q=清晨恢复药水"), ["91000006", "91000017"]);
});
test("optional search scopes form a union then intersect selected categories", () => {
  assert.equal(find("q=晨曦守护").length, 0);
  assert.deepEqual(ids("q=晨曦守护&buff=1"), ["91000006"]);
  assert.deepEqual(ids("q=晨曦守护&buff=1&cats=equipment"), []);
  assert.deepEqual(ids("q=月下旅人&setname=1"), ["91000009"]);
  assert.equal(find("q=未收录阵容&desc=1").length, 1);
});
test("unknown categories excluded only with a category selection; descendants use stable keys", () => {
  assert.deepEqual(ids("q=91000016"), ["91000016"]);
  assert.deepEqual(
    ids("q=91000016&cats=equipment,consumable,material,quest,pet"),
    [],
  );
  assert.ok(ids("cats=craft-material").includes("91000018"));
  assert.equal(categoryTree(data.items).length, 5);
});
test("unknown permissions are neither allowed nor denied; zero and level systems remain distinct", () => {
  assert.deepEqual(ids("q=91000013&trade=0"), []);
  assert.deepEqual(ids("q=91000013&trade=1"), []);
  assert.deepEqual(ids("q=91000014&lvmax=0"), ["91000014"]);
  assert.deepEqual(ids("q=91000014&liimax=0"), []);
  assert.deepEqual(ids("liimin=0.01&liimax=0.01"), ["91000010", "91000014"]);
  assert.deepEqual(ids("q=91000016&lvmin=0"), []);
});
test("invalid ranges are rejected without rewriting input", () => {
  for (const query of [
    "lvmin=1.2",
    "limin=-1",
    "liimin=0.001",
    "lvmin=5&lvmax=2",
    "lvmin=1e3",
  ]) {
    const params = new URLSearchParams(query);
    assert.ok(rangeError(params));
    assert.equal(params.toString(), query);
    assert.equal(filterItems(data.items, params).length, 0);
  }
});
test("pagination clamps unsafe URLs and supports keeping the original first record on resize", () => {
  assert.equal(pageState(new URLSearchParams("page=2.5&size=11"), 17).page, 1);
  assert.equal(pageState(new URLSearchParams("page=99"), 17).page, 2);
  const original = pageState(new URLSearchParams("page=2&size=10"), 17);
  const resized = pageState(
    new URLSearchParams(`page=${Math.floor(original.start / 20) + 1}&size=20`),
    17,
  );
  assert.ok(
    original.start >= resized.start &&
      original.start < resized.start + resized.size,
  );
});
