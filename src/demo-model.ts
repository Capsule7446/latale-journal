// Display fixtures only. These types are not the production data contract.
export type Category =
  | "equipment"
  | "consumable"
  | "material"
  | "quest"
  | "pet";
export type Stat = { label: string; value: string | null; unit?: string };
export type Reference = {
  id: string;
  name: string;
  quantity?: string;
  available?: boolean;
};
// Explicit display identities for fictional routes, not a frozen production schema.
export type RouteIdentity = { id: string | null; name: string | null };
export type RelationRoute =
  | { kind: "exchange" | "purchase"; npc: RouteIdentity | null }
  | {
      kind: "life-skill";
      category: RouteIdentity | null;
      level: number | null;
      path: RouteIdentity[] | null;
    }
  | { kind: "decomposition" | "upgrade" };
export type Relation = {
  id: string;
  group: string;
  title: string;
  route?: RelationRoute;
  note?: string;
  input?: Reference;
  materials?: Reference[];
  products?: Reference[];
  cost?: string | null;
  condition?: string;
  location?: string;
};
export type DemoItem = {
  id: string;
  name: string;
  category: Category;
  path: { key: string; label: string }[];
  color?: string;
  icon?: string;
  description: string;
  initial?: boolean;
  form?: string;
  stage?: string;
  versions?: string[];
  jobs?: string[];
  levels?: { normal?: number; transcend1?: number; transcend2?: number };
  flags: {
    trade: boolean | null;
    storage: boolean | null;
    destroy: boolean | null;
    auction: boolean | null;
  };
  stats?: Stat[];
  effects?: string[];
  affixes?: {
    name: string;
    min?: string;
    max?: string;
    unit?: string;
    reference?: string;
  }[];
  awakening?: { stage: string; candidates: string[] }[];
  set?: {
    name: string;
    id: string;
    tiers: { count: number; effects: string[] }[];
    members: Reference[];
  };
  buffs?: { name: string | null; description: string | null; target: string }[];
  title?: {
    name: string;
    chance: string | null;
    stats: Stat[];
    effect: string;
  };
  sources?: Relation[];
  uses?: Relation[];
  quests?: { id: string; name: string; role: string; quantity: string }[];
  formations?: { id: string; name: string; stats: Stat[]; effect: string }[];
};
export type DemoPackage = {
  kind: "visual-demo";
  notice: string;
  items: DemoItem[];
};
export type CategoryNode = {
  key: string;
  label: string;
  children: CategoryNode[];
};
export const categories: Record<Category, string> = {
  equipment: "装备",
  consumable: "消耗",
  material: "其他",
  quest: "任务",
  pet: "宠物",
};
export const flagLabels = {
  trade: "交易",
  storage: "存仓",
  destroy: "破坏",
  auction: "拍卖",
} as const;
export const levelFields = [
  ["lv", "normal", "普通等级"],
  ["li", "transcend1", "超越Ⅰ"],
  ["lii", "transcend2", "超越Ⅱ"],
] as const;
