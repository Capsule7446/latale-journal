import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  categoryTree,
  filterItems,
  pageState,
  rangeError,
  normalize,
} from "../src/catalog.ts";
import { categoryKey } from "../src/item-data.ts";
import { readFixture } from "./fixture-package.ts";

const {
  document: { items },
} = readFixture();

test("unconnected input never supplies records for any query or restored URL", () => {
  for (const query of [
    "",
    "q=1",
    "initial=0",
    "cats=equipment",
    "lvmin=0",
    "state=ready&item=1",
  ]) {
    assert.deepEqual(filterItems([], new URLSearchParams(query)), []);
  }
  assert.ok(categoryTree([]).every((node) => node.children.length === 0));
});

test("retired fixture assets and generator are absent", () => {
  for (const file of [
    "items.json",
    "consumable.svg",
    "equipment.svg",
    "material.svg",
    "pet.svg",
    "quest.svg",
  ]) {
    assert.equal(
      fs.existsSync(new URL(`../public/demo/${file}`, import.meta.url)),
      false,
    );
  }
  assert.equal(
    fs.existsSync(new URL("../scripts/create-demo.mjs", import.meta.url)),
    false,
  );
});

test("invalid filter input is rejected without rewriting the user's text", () => {
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
  }
});

test("pagination normalizes invalid page input and handles no records", () => {
  assert.deepEqual(pageState(new URLSearchParams("page=99&size=10"), 0), {
    size: 10,
    page: 1,
    pages: 1,
    start: 0,
  });
  assert.equal(pageState(new URLSearchParams("page=2.5&size=11"), 17).page, 1);
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

test("real records retain exact IDs and same-name identities in stable numeric order", () => {
  const anchor = items.find((item) => item.id === "84905009");
  assert.ok(anchor);
  assert.deepEqual(filterItems(items, new URLSearchParams({ q: anchor.id })), [
    anchor,
  ]);
  assert.deepEqual(
    filterItems(items, new URLSearchParams({ q: "849050" })),
    [],
  );
  assert.equal(normalize(" AＢＣ "), "abc");
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const key = normalize(item.name);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  const sameName = [...groups.values()].find((group) => group.length > 1);
  assert.ok(
    sameName,
    "Producer fixture must cover duplicate names with distinct IDs",
  );
  const result = filterItems(
    items,
    new URLSearchParams({ q: ` ${sameName[0].name} ` }),
  );
  assert.deepEqual(
    result.slice(0, sameName.length).map((item) => item.id),
    sameName.map((item) => item.id),
  );
  assert.equal(new Set(result.map((item) => item.id)).size, result.length);
});

test("description search includes only the original producer text when explicitly enabled", () => {
  const candidate = items.find(
    (item) =>
      item.description.status === "success" &&
      !normalize(item.name).includes(normalize(item.description.value)),
  );
  assert.ok(candidate);
  const query = new URLSearchParams({ q: candidate.description.value });
  assert.ok(!filterItems(items, query).includes(candidate));
  query.set("desc", "1");
  assert.ok(filterItems(items, query).includes(candidate));
});

test("unsupported legacy conditions never filter verified basic records", () => {
  for (const query of [
    "initial=1&lvmin=invalid&lvmax=0&liimin=-1&job=unsupported&trade=0&storage=1&destroy=0&auction=1",
    "initial=0&buff=1&setname=1&state=empty&source=unsupported&open-routes=obsolete",
  ])
    assert.deepEqual(filterItems(items, new URLSearchParams(query)), items);
});

test("any category selection excludes incomplete paths, clearing selection restores the same record", () => {
  const missing = items.find((item) => item.category.status !== "success");
  assert.ok(missing);
  const query = new URLSearchParams({ q: missing.id });
  assert.deepEqual(filterItems(items, query), [missing]);
  query.set("cats", "equipment,consumables,other,quests,pets");
  assert.deepEqual(filterItems(items, query), []);
  query.delete("cats");
  assert.deepEqual(filterItems(items, query), [missing]);
  assert.equal(
    filterItems(
      items,
      new URLSearchParams("cats=equipment,consumables,other,quests,pets"),
    ).length,
    items.filter((item) => item.category.status === "success").length,
  );
});

test("classification uses complete prefixes and does not merge repeated child keys under different parents", () => {
  const prefixesByKey = new Map<string, Set<string>>();
  for (const item of items.filter(
    (item) => item.category.status === "success",
  )) {
    const prefix: string[] = [];
    for (const part of item.category.segments) {
      prefix.push(part.key);
      const paths = prefixesByKey.get(part.key) ?? new Set<string>();
      paths.add(categoryKey(prefix));
      prefixesByKey.set(part.key, paths);
    }
  }
  const collision = [...prefixesByKey.values()].find((paths) => paths.size > 1);
  assert.ok(
    collision,
    "Producer fixture must cover repeated child keys under different parents",
  );
  const tree = categoryTree(items);
  const flatten = (nodes: typeof tree): string[] =>
    nodes.flatMap((node) => [node.key, ...flatten(node.children)]);
  const identities = flatten(tree);
  assert.equal(identities.length, new Set(identities).size);
  for (const key of collision) {
    assert.ok(identities.includes(key));
    const matches = filterItems(items, new URLSearchParams({ cats: key }));
    assert.ok(matches.length > 0);
    assert.ok(
      matches.every((item) =>
        item.category.segments.some(
          (_, index) =>
            categoryKey(
              item.category.segments
                .slice(0, index + 1)
                .map((part) => part.key),
            ) === key,
        ),
      ),
    );
  }
});
