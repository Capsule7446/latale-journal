import { levelFields } from "./display-model.ts";
import type { CategoryNode } from "./display-model.ts";
import type { Item } from "./item-data.ts";
import { categoryKey, dataCategories } from "./item-data.ts";

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

export function filterItems(items: Item[], params: URLSearchParams): Item[] {
  const query = normalize(params.get("q") || "");
  const numeric = /^\d+$/.test(query);
  const selected = values(params, "cats");
  const exact: Item[] = [],
    rest: Item[] = [];
  for (const item of items) {
    if (
      selected.length &&
      (item.category.status !== "success" ||
        !item.category.segments.some((_, index) =>
          selected.includes(
            categoryKey(
              item.category.segments
                .slice(0, index + 1)
                .map((part) => part.key),
            ),
          ),
        ))
    )
      continue;
    if (query) {
      if (numeric) {
        if (item.id !== query) continue;
      } else {
        const texts = [item.name];
        if (params.get("desc") === "1" && item.description.status === "success")
          texts.push(item.description.value);
        if (!texts.some((text) => normalize(text).includes(query))) continue;
      }
    }
    (query && normalize(item.name) === query ? exact : rest).push(item);
  }
  // The validated release is already sorted by numeric ID. Keep that order within each rank.
  return exact.concat(rest);
}

export function categoryTree(items: Item[]): CategoryNode[] {
  const roots = Object.entries(dataCategories).map(([key, label]) => ({
    key,
    label,
    children: [] as CategoryNode[],
  }));
  for (const item of items) {
    if (item.category.status !== "success") continue;
    let nodes = roots;
    const prefix: string[] = [];
    for (const part of item.category.segments) {
      prefix.push(part.key);
      const key = categoryKey(prefix);
      let node = nodes.find((node) => node.key === key);
      if (!node) {
        node = { key, label: part.label!, children: [] };
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
