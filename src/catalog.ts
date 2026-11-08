import { categories, flagLabels, levelFields } from "./demo-model.ts";
import type { CategoryNode, DemoItem } from "./demo-model.ts";

export const normalize = (text: string) =>
  text.trim().normalize("NFKC").toLocaleLowerCase("en");
export const values = (params: URLSearchParams, key: string) =>
  (params.get(key) || "").split(",").filter(Boolean);

export function rangeError(params: URLSearchParams): string | null {
  for (const [key, , label] of levelFields) {
    const min = params.get(`${key}min`) || "",
      max = params.get(`${key}max`) || "";
    const pattern = key === "lii" ? /^\d+(?:\.\d{1,2})?$/ : /^\d+$/;
    if (
      [min, max].some(
        (value) =>
          value !== "" &&
          (!pattern.test(value) || !Number.isFinite(Number(value))),
      )
    ) {
      return `${label}请输入非负${key === "lii" ? "数，最多两位小数" : "整数"}。`;
    }
    if (min && max && Number(min) > Number(max))
      return `${label}最低值不能大于最高值，请修正原条件。`;
  }
  return null;
}

export function filterItems(
  items: DemoItem[],
  params: URLSearchParams,
): DemoItem[] {
  if (rangeError(params)) return [];
  const query = normalize(params.get("q") || "");
  const numeric = /^\d+$/.test(query);
  const specificStage = numeric || /(?:\+\d+|[★☆]+)$/.test(query);
  const selected = values(params, "cats");
  return items
    .filter((item) => {
      if (query) {
        if (numeric) {
          if (item.id !== query) return false;
        } else {
          const texts = [item.name];
          if (params.get("desc") === "1") texts.push(item.description);
          if (params.get("buff") === "1")
            for (const buff of item.buffs || [])
              texts.push(buff.name || "", buff.description || "");
          if (params.get("setname") === "1" && item.set)
            texts.push(item.set.name);
          if (!texts.some((text) => normalize(text).includes(query)))
            return false;
        }
      }
      if (
        params.get("initial") !== "0" &&
        !specificStage &&
        item.initial === false
      )
        return false;
      if (
        selected.length &&
        !item.path.some((node) => selected.includes(node.key))
      )
        return false;
      const job = params.get("job");
      if (job && !item.jobs?.includes(job)) return false;
      for (const [key, field] of levelFields) {
        const min = params.get(`${key}min`),
          max = params.get(`${key}max`);
        const value = item.levels?.[field];
        if (min && (value === undefined || value < Number(min))) return false;
        if (max && (value === undefined || value > Number(max))) return false;
      }
      for (const key of Object.keys(
        flagLabels,
      ) as (keyof typeof flagLabels)[]) {
        const filter = params.get(key);
        if (
          (filter === "1" || filter === "0") &&
          item.flags[key] !== (filter === "1")
        )
          return false;
      }
      return true;
    })
    .sort(
      (a, b) =>
        Number(normalize(b.name) === query) -
          Number(normalize(a.name) === query) || Number(a.id) - Number(b.id),
    );
}

export function categoryTree(items: DemoItem[]): CategoryNode[] {
  const roots = Object.entries(categories).map(([key, label]) => ({
    key,
    label,
    children: [] as CategoryNode[],
  }));
  for (const item of items) {
    let nodes = roots;
    for (const part of item.path) {
      let node = nodes.find((node) => node.key === part.key);
      if (!node) {
        node = { ...part, children: [] };
        nodes.push(node);
      }
      nodes = node.children;
    }
  }
  return roots;
}

export function pageState(
  params: URLSearchParams,
  total: number,
  prefix = "",
  sizes = [10, 20, 40],
) {
  const requestedSize = Number(params.get(`${prefix}size`));
  const size = sizes.includes(requestedSize) ? requestedSize : sizes[0];
  const pages = Math.max(1, Math.ceil(total / size));
  const requestedPage = Number(params.get(`${prefix}page`));
  const page = Number.isInteger(requestedPage)
    ? Math.max(1, Math.min(requestedPage, pages))
    : 1;
  return { size, page, pages, start: (page - 1) * size };
}
