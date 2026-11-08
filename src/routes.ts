import type { Relation } from "./display-model.ts";

export type RelationDirection = "sources" | "uses";
export type RouteGroup = {
  key: string;
  description: string;
  incomplete: boolean;
  schemes: Relation[];
};

const hasId = (id: string | null | undefined): id is string =>
  typeof id === "string" && id.trim().length > 0;

function describeRoute(relation: Relation) {
  const { route, input } = relation;
  let identity: unknown[] | undefined;
  let description: string;
  switch (route?.kind) {
    case "exchange":
    case "purchase": {
      const name = route.npc?.name || "NPC姓名未收录";
      description =
        route.kind === "exchange" ? `[兑换]${name}` : `[购买][${name}]`;
      if (hasId(route.npc?.id)) identity = [route.kind, "npc", route.npc.id];
      break;
    }
    case "life-skill": {
      const labels =
        route.path?.map((node) => node.name || "分类名称未收录") || [];
      description = `[${route.category?.name || "生活技能类别未收录"}][Lv${route.level ?? "-"}]${labels.join(" > ") || "制造分类路径未收录"}`;
      if (
        hasId(route.category?.id) &&
        route.level !== null &&
        Number.isFinite(route.level) &&
        route.path?.length &&
        route.path.every((node) => hasId(node.id))
      ) {
        identity = [
          route.kind,
          route.category.id,
          route.level,
          route.path.map((node) => node.id),
        ];
      }
      break;
    }
    case "decomposition":
    case "upgrade": {
      const kind = route.kind === "decomposition" ? "分解" : "升级";
      description = `[${kind}][${input?.name || "主输入未收录"}]`;
      if (hasId(input?.id)) identity = [route.kind, "item", input.id];
      break;
    }
    default:
      description = `[${relation.group}]${relation.title || "途径名称未收录"}`;
  }
  return {
    description,
    incomplete: !identity,
    // A missing route identity never permits title-based grouping.
    identity: identity || [route?.kind || "other", "record", relation.id],
  };
}

/** Group whole schemes before pagination; never merge their fields or quantities. */
export function groupRoutes(
  itemId: string,
  direction: RelationDirection,
  rows: Relation[],
): RouteGroup[] {
  const groups = new Map<string, RouteGroup>();
  for (const relation of rows) {
    const route = describeRoute(relation);
    const key = JSON.stringify(["item", itemId, direction, ...route.identity]);
    const group = groups.get(key);
    if (group) group.schemes.push(relation);
    else
      groups.set(key, {
        key,
        description: route.description,
        incomplete: route.incomplete,
        schemes: [relation],
      });
  }
  return [...groups.values()];
}

export function expandedRoutes(params: URLSearchParams): string[] {
  try {
    const value: unknown = JSON.parse(params.get("open-routes") || "[]");
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter((key): key is string => typeof key === "string"),
          ),
        ]
      : [];
  } catch {
    return [];
  }
}

export function toggleRoute(
  params: URLSearchParams,
  key: string,
): string | null {
  const current = expandedRoutes(params);
  const next = current.includes(key)
    ? current.filter((value) => value !== key)
    : [...current, key];
  return next.length ? JSON.stringify(next) : null;
}
