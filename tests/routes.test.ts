import test from "node:test";
import assert from "node:assert/strict";
import type { Relation } from "../src/display-model.ts";
import { expandedRoutes, groupRoutes, toggleRoute } from "../src/routes.ts";

// Opaque identity tokens only. No game names, descriptions or browser fixtures.
const record = (id: string, npc: string | null): Relation => ({
  id,
  title: "",
  group: "",
  route: { kind: "exchange", npc: { id: npc, name: null } },
});

test("no connected records produce no route groups", () => {
  assert.deepEqual(groupRoutes("a", "uses", []), []);
});

test("grouping preserves nonadjacent records without mutating or merging their fields", () => {
  const a = record("a", "one"),
    b = record("b", "two"),
    c = record("c", "one");
  const rows = [a, b, c];
  const before = JSON.stringify(rows);
  const groups = groupRoutes("item", "uses", rows);
  assert.deepEqual(
    groups.map((group) => group.schemes.map((row) => row.id)),
    [["a", "c"], ["b"]],
  );
  assert.equal(groups[0].schemes[0], a);
  assert.equal(groups[0].schemes[1], c);
  assert.equal(JSON.stringify(rows), before);
});

test("missing identities are separate even with identical empty display fields", () => {
  const groups = groupRoutes("item", "uses", [
    record("a", null),
    record("b", null),
  ]);
  assert.equal(groups.length, 2);
  assert.ok(groups.every((group) => group.incomplete));
});

test("current item, direction and route kind isolate otherwise identical IDs", () => {
  const a = record("a", "one");
  const b: Relation = {
    ...a,
    id: "b",
    route: { kind: "purchase", npc: { id: "one", name: null } },
  };
  assert.equal(groupRoutes("item", "uses", [a, b]).length, 2);
  const keys = [
    groupRoutes("one", "uses", [a]),
    groupRoutes("two", "uses", [a]),
    groupRoutes("one", "sources", [a]),
  ].map((groups) => groups[0].key);
  assert.equal(new Set(keys).size, 3);
});

test("main input IDs govern upgrades rather than auxiliary input IDs", () => {
  const a: Relation = {
    id: "a",
    title: "",
    group: "",
    route: { kind: "upgrade" },
    input: { id: "main", name: "" },
    materials: [{ id: "aux-a", name: "" }],
  };
  const b = { ...a, id: "b", materials: [{ id: "aux-b", name: "" }] };
  const c = { ...a, id: "c", input: undefined };
  assert.deepEqual(
    groupRoutes("item", "uses", [a, b, c]).map((group) => group.schemes.length),
    [2, 1],
  );
  assert.ok(groupRoutes("item", "uses", [c])[0].incomplete);
});

test("expansion keys round-trip independently and malformed state stays closed", () => {
  const key = groupRoutes("one", "uses", [record("a", "one")])[0].key;
  const other = groupRoutes("one", "sources", [record("a", "one")])[0].key;
  const params = new URLSearchParams();
  params.set("open-routes", toggleRoute(params, key)!);
  params.set("open-routes", toggleRoute(params, other)!);
  assert.deepEqual(expandedRoutes(params), [key, other]);
  params.set("open-routes", toggleRoute(params, key)!);
  assert.deepEqual(expandedRoutes(params), [other]);
  assert.equal(toggleRoute(params, other), null);
  for (const value of ["oops", "{}", "null", "[1,null,false]"])
    assert.deepEqual(
      expandedRoutes(new URLSearchParams({ "open-routes": value })),
      [],
    );
});
