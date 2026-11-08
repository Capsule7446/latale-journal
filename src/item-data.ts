import type { Item, State } from "../contracts/items-v1/types.d.ts";
export type { Item } from "../contracts/items-v1/types.d.ts";

// Navigation labels are UI text; every non-root label comes from the release.
export const dataCategories: Record<string, string> = {
  equipment: "装备",
  consumables: "消耗",
  other: "其他",
  quests: "任务",
  pets: "宠物",
};
export const categoryStates: Record<State, string> = {
  success: "已辨识",
  missing: "分类缺失",
};
export const categoryKey = (keys: string[]) =>
  keys.map(encodeURIComponent).join("/");
export function categoryLabel(item: Item) {
  return item.category.segments
    .map((part, index) =>
      index === 0
        ? dataCategories[part.key]
        : (part.label ?? categoryStates[part.status]),
    )
    .join(" / ");
}
