import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import type { DemoPackage, Relation } from "../src/demo-model.ts";
import { groupRoutes, expandedRoutes, toggleRoute } from "../src/routes.ts";
import { pageState } from "../src/catalog.ts";

const data: DemoPackage = JSON.parse(
  fs.readFileSync(
    new URL("../public/demo/items.json", import.meta.url),
    "utf8",
  ),
);
const material = data.items.find((item) => item.id === "91000005")!;
const relation = (id: string, patch: Partial<Relation> = {}): Relation => ({
  id,
  group: "兑换",
  title: "同名方案",
  route: { kind: "exchange", npc: { id: "npc-a", name: "阿洛" } },
  ...patch,
});
const groups = (rows: Relation[]) => groupRoutes("91000005", "uses", rows);

test("nonadjacent alternatives share one entry without changing materials, outputs, costs or locations", () => {
  const before = JSON.stringify(material.uses);
  const result = groups(material.uses!);
  assert.equal(material.uses!.length, 7);
  assert.equal(result.length, 6);
  assert.deepEqual(
    result[0].schemes.map((row) => row.id),
    ["demo-exchange-east-paper", "demo-exchange-east-engraved"],
  );
  assert.equal(result[0].schemes[0], material.uses![0]);
  assert.equal(result[0].schemes[1], material.uses![6]);
  assert.equal(result[0].schemes[0].cost, "0");
  assert.equal(result[0].schemes[1].cost, null);
  assert.deepEqual(
    result[0].schemes.map((row) => row.products?.length),
    [1, 2],
  );
  assert.equal(JSON.stringify(material.uses), before);
});

test("same-name NPCs remain separate and changing a label never changes route identity", () => {
  const a = relation("a");
  const b = relation("b", {
    route: { kind: "exchange", npc: { id: "npc-b", name: "阿洛" } },
  });
  const renamed = relation("c", {
    title: "另一方案",
    route: { kind: "exchange", npc: { id: "npc-a", name: "新名字" } },
  });
  assert.equal(groups([a, b, renamed]).length, 2);
  assert.deepEqual(
    groups([a, b, renamed])[0].schemes.map((row) => row.id),
    ["a", "c"],
  );
  assert.equal(groups([a])[0].key, groups([renamed])[0].key);
});

test("route kind, current item and direction each isolate otherwise identical identities", () => {
  const exchange = relation("exchange");
  const purchase = relation("purchase", {
    route: { kind: "purchase", npc: { id: "npc-a", name: "阿洛" } },
  });
  assert.equal(groups([exchange, purchase]).length, 2);
  const keys = [
    groupRoutes("one", "uses", [exchange]),
    groupRoutes("two", "uses", [exchange]),
    groupRoutes("one", "sources", [exchange]),
  ].map((rows) => rows[0].key);
  assert.equal(new Set(keys).size, 3);
});

test("five descriptions use explicit route fields and the exact approved life-skill format", () => {
  const descriptions = groups(material.uses!).map((group) => group.description);
  for (const label of [
    "[兑换]阿洛",
    "[购买][阿洛]",
    "[吉恩蒂亚成品][Lv1]成品制造 > 拳套",
    "[分解][星光碎片]",
    "[升级][星光练习剑]",
  ]) {
    assert.ok(descriptions.includes(label), label);
  }
});

test("life-skill grouping requires category, level and complete ordered path identities", () => {
  const source = material.uses!.find(
    (row) => row.route?.kind === "life-skill",
  )!;
  if (source.route?.kind !== "life-skill") throw new Error("Missing fixture");
  const route = source.route;
  const same = relation("same", {
    route: { ...route, category: { ...route.category!, name: "名称变更" } },
  });
  const level = relation("level", { route: { ...route, level: 2 } });
  const category = relation("category", {
    route: {
      ...route,
      category: { ...route.category!, id: "another-category" },
    },
  });
  const path = relation("path", {
    route: {
      ...route,
      path: [route.path![0], { ...route.path![1], id: "another-path" }],
    },
  });
  assert.equal(groups([source, same, level, category, path]).length, 4);
  const unknown = relation("unknown", {
    route: { ...route, path: [{ id: null, name: "拳套" }] },
  });
  assert.equal(groups([unknown, { ...unknown, id: "unknown-two" }]).length, 2);
  assert.ok(groups([unknown])[0].incomplete);
  assert.equal(
    groups([relation("zero", { route: { ...route, level: 0 } })])[0].incomplete,
    false,
  );
  assert.equal(
    groups([relation("null", { route: { ...route, level: null } })])[0]
      .incomplete,
    true,
  );
});

test("decomposition and upgrades group only by their explicit main input, never auxiliary materials", () => {
  const a = relation("a", {
    route: { kind: "upgrade" },
    input: { id: "input-a", name: "主输入" },
    materials: [{ id: "aux-a", name: "辅助材料" }],
  });
  const b = {
    ...a,
    id: "b",
    materials: [{ id: "aux-b", name: "另一辅助材料" }],
  };
  const c = { ...a, id: "c", input: { id: "input-b", name: "主输入" } };
  const d = { ...a, id: "d", route: { kind: "decomposition" as const } };
  assert.deepEqual(
    groups([a, b, c, d]).map((group) => group.schemes.length),
    [2, 1, 1],
  );
  const unknown = { ...a, input: undefined };
  assert.equal(groups([unknown, { ...unknown, id: "missing-two" }]).length, 2);
  assert.equal(groups([unknown])[0].description, "[升级][主输入未收录]");
});

test("missing NPC or route identities preserve separate records even with matching names and titles", () => {
  const unknown = relation("a", {
    route: { kind: "exchange", npc: { id: null, name: "阿洛" } },
  });
  const noRoute = relation("no-route", { route: undefined });
  const rows = groups([
    unknown,
    { ...unknown, id: "b" },
    noRoute,
    { ...noRoute, id: "other-route" },
  ]);
  assert.equal(rows.length, 4);
  assert.ok(rows.every((row) => row.incomplete));
});

test("pagination counts complete route groups and keeps separated alternatives on the same page", () => {
  const routes = groups(material.uses!);
  const { start, size, pages } = pageState(
    new URLSearchParams(),
    routes.length,
    "",
    [5, 10, 20],
  );
  assert.equal(pages, 2);
  assert.equal(routes.slice(start, start + size)[0].schemes.length, 2);
  assert.equal(
    routes
      .slice(size)
      .flatMap((route) => route.schemes)
      .some((row) => row.id === "demo-exchange-east-engraved"),
    false,
  );
});

test("expansion survives context switches and malformed URLs cannot fabricate shared state", () => {
  const key = groups([relation("a")])[0].key;
  const other = groupRoutes("another-item", "sources", [relation("a")])[0].key;
  const params = new URLSearchParams();
  assert.deepEqual(expandedRoutes(params), []);
  params.set("open-routes", toggleRoute(params, key)!);
  params.set("open-routes", toggleRoute(params, other)!);
  assert.deepEqual(expandedRoutes(params), [key, other]);
  params.set("open-routes", toggleRoute(params, key)!);
  assert.deepEqual(expandedRoutes(params), [other]);
  assert.equal(toggleRoute(params, other), null);
  for (const value of ["oops", "{}", "null", "[1,null,false]", '"fake"'])
    assert.deepEqual(
      expandedRoutes(new URLSearchParams({ "open-routes": value })),
      [],
    );
});
