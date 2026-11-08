// Hand-authored visual fixtures. No game files, source databases or production rules.
import fs from "node:fs";

const root = "public/demo";
fs.mkdirSync(root, { recursive: true });
const roots = {
  equipment: "装备",
  consumable: "消耗",
  material: "其他",
  quest: "任务",
  pet: "宠物",
};
const part = (key, label) => ({ key, label });
const flags = { trade: true, storage: true, destroy: false, auction: null };
const path = (category, ...children) => [
  part(category, roots[category]),
  ...children.map(([key, label]) => part(key, label)),
];
const base = (id, name, category, children = []) => ({
  id: String(id),
  name,
  category,
  path: path(category, ...children),
  icon: `/demo/${category}.svg`,
  description:
    "此条为页面演示资料。名称、数值与关系仅用于检查排版，不对应游戏定义。",
  flags: { ...flags },
});
const reference = (id, name, quantity = "1") => ({
  id: String(id),
  name,
  quantity,
});
const npcA = { id: "demo-npc-alo-east", name: "阿洛" };
const npcB = { id: "demo-npc-mina-west", name: "米娜" };
const lifeRoute = (categoryId, categoryName, leafId, leafName) => ({
  kind: "life-skill",
  category: { id: categoryId, name: categoryName },
  level: 1,
  path: [
    { id: "demo-finished-crafting", name: "成品制造" },
    { id: leafId, name: leafName },
  ],
});
const swordPath = [
  ["battle", "战斗物品"],
  ["weapon", "武器"],
  ["onehand", "单手剑"],
];
const items = [
  ...[
    [91000001, "星光练习剑", "普通", "初始", true, "120", [91000001, 91000002]],
    [
      91000002,
      "星光练习剑 +1",
      "普通",
      "+1",
      false,
      "150",
      [91000001, 91000002],
    ],
    [
      91000003,
      "觉醒·星光练习剑",
      "觉醒",
      "初始",
      true,
      "180",
      [91000003, 91000004],
    ],
    [
      91000004,
      "觉醒·星光练习剑 +1",
      "觉醒",
      "+1",
      false,
      "210",
      [91000003, 91000004],
    ],
  ].map(([id, name, form, stage, initial, attack, versions]) => ({
    ...base(id, name, "equipment", swordPath),
    color: "#e75aa0",
    form,
    stage,
    initial,
    versions: versions.map(String),
    jobs: ["盾卫", "守护者"],
    levels: { normal: id === 91000002 ? 120 : 100, transcend1: 0 },
    stats: [
      { label: "最小攻击力", value: attack, unit: "点" },
      { label: "物理最小伤害", value: "13", unit: "%" },
      { label: "移动速度", value: "-2", unit: "%" },
      { label: "耐久", value: null },
    ],
    effects: ["星光斩 +2 Lv\n效果条件：装备此道具时。"],
    description:
      "一柄用来展示普通与觉醒版本的练习剑。\n这里保留长说明的原始换行；属性和强化阶段均为演示。",
    affixes: [
      { name: "物理最大伤害" },
      { name: "力量" },
      { name: "技能冷却时间减少" },
    ],
    awakening:
      form === "觉醒"
        ? [
            {
              stage: "阶段一",
              candidates: ["力量 +10 点", "物理最大伤害 +1.5%"],
            },
            {
              stage: "阶段二",
              candidates: [
                "星光斩 +1 Lv",
                "力量 +12 点",
                "技能冷却时间 -0.5 秒",
              ],
            },
            {
              stage: "阶段三",
              candidates: ["星光斩 +2 Lv", "最大生命值 +100 点"],
            },
          ]
        : [],
    sources: [
      {
        id: `craft-${id}`,
        group: "制作",
        title: "练习剑制作",
        route: lifeRoute(
          "demo-practice-products",
          "练习成品",
          "demo-sword-crafting",
          "单手剑",
        ),
        materials: [reference(91000005, "星光碎片", "12")],
        products: [reference(id, name)],
        cost: "0",
        condition: "演示制作配方",
      },
    ],
    uses: initial
      ? [
          {
            id: `upgrade-${id}`,
            group: "升级",
            title: "强化为 +1",
            route: { kind: "upgrade" },
            input: reference(id, name),
            materials: [reference(91000005, "星光碎片", "6")],
            products: [reference(Number(id) + 1, `${name} +1`)],
            cost: "1,200",
            condition: "仅展示这一阶段的材料",
          },
        ]
      : [],
  })),
  {
    ...base(91000005, "星光碎片", "material", [
      ["craft-material", "制作材料"],
      ["ore", "矿物"],
    ]),
    color: "#387bcc",
    uses: [
      {
        id: "demo-exchange-east-paper",
        group: "兑换",
        title: "碎片与纸片兑换",
        route: { kind: "exchange", npc: npcA },
        materials: [
          reference(91000005, "星光碎片", "6"),
          reference(91000013, "褪色的旧纸片", "2"),
        ],
        products: [reference(91000001, "星光练习剑")],
        cost: "0",
        location: "练习镇 > 东门",
        condition: "完成练习委托后办理（演示）",
      },
      {
        id: "demo-exchange-west",
        group: "兑换",
        title: "西门兑换方案",
        route: { kind: "exchange", npc: npcB },
        materials: [reference(91000005, "星光碎片", "20")],
        products: [reference(91000003, "觉醒·星光练习剑")],
        cost: "500",
        location: "练习镇 > 西门",
        condition: "在西门独立办理（演示）",
      },
      {
        id: "demo-craft-fists",
        group: "制作",
        title: "练习拳套制作",
        route: lifeRoute(
          "demo-giantia-products",
          "吉恩蒂亚成品",
          "demo-fist-crafting",
          "拳套",
        ),
        materials: [reference(91000005, "星光碎片", "12")],
        products: [
          { ...reference(91999992, "星光练习拳套"), available: false },
        ],
        cost: "0",
        condition: "用户指定的生活技能外层格式示例；未由游戏资料解析。",
      },
      {
        id: "demo-purchase-east",
        group: "购买",
        title: "以碎片支付的商店方案",
        route: { kind: "purchase", npc: npcA },
        materials: [reference(91000005, "星光碎片", "1")],
        products: [reference(91000006, "清晨恢复药水", "2")],
        cost: null,
        location: "练习镇 > 东门",
        condition: "碎片作为付款道具；额外费用未收录（演示）",
      },
      {
        id: "demo-decompose-fragment",
        group: "分解",
        title: "碎片分解方案",
        route: { kind: "decomposition" },
        input: reference(91000005, "星光碎片"),
        products: [
          reference(91000013, "褪色的旧纸片", "2"),
          reference(91000018, "古老星图中的第七块铭文碎片"),
        ],
        cost: null,
        condition: "产物是候选，未收录概率（演示）",
      },
      {
        id: "demo-upgrade-sword",
        group: "升级",
        title: "练习剑强化方案",
        route: { kind: "upgrade" },
        input: reference(91000001, "星光练习剑"),
        materials: [reference(91000005, "星光碎片", "6")],
        products: [reference(91000002, "星光练习剑 +1")],
        cost: "1,200",
        condition: "仅展示当前阶段，不合计整条路线。",
      },
      // Intentionally nonadjacent: alternatives must join before pagination.
      {
        id: "demo-exchange-east-engraved",
        group: "兑换",
        title: "碎片与铭文兑换",
        route: { kind: "exchange", npc: npcA },
        materials: [
          reference(91000005, "星光碎片", "10"),
          reference(91000018, "古老星图中的第七块铭文碎片", "3"),
        ],
        products: [
          reference(91000001, "星光练习剑"),
          reference(91000006, "清晨恢复药水", "2"),
        ],
        cost: null,
        location: "练习镇 > 工坊",
        condition: "同一 NPC 的另一办理地点与材料方案（演示）",
      },
    ],
    sources: [
      {
        id: "demo-fragment-exchange-paper",
        group: "其他来源",
        title: "纸片兑换碎片",
        route: { kind: "exchange", npc: npcA },
        materials: [reference(91000013, "褪色的旧纸片", "2")],
        products: [reference(91000005, "星光碎片", "6")],
        cost: "0",
        location: "练习镇 > 东门",
      },
      {
        id: "demo-fragment-decomposition",
        group: "其他来源",
        title: "分解练习剑获得碎片",
        route: { kind: "decomposition" },
        input: reference(91000001, "星光练习剑"),
        products: [reference(91000005, "星光碎片", "8")],
        cost: "0",
        condition: "概率未收录（演示）",
      },
      {
        id: "demo-fragment-exchange-engraved",
        group: "其他来源",
        title: "铭文兑换碎片",
        route: { kind: "exchange", npc: npcA },
        materials: [reference(91000018, "古老星图中的第七块铭文碎片", "1")],
        products: [reference(91000005, "星光碎片", "12")],
        cost: null,
        location: "练习镇 > 工坊",
        condition: "与另一兑换方案分别保留（演示）",
      },
      {
        id: "demo-fragment-purchase",
        group: "其他来源",
        title: "购买碎片",
        route: { kind: "purchase", npc: npcA },
        products: [reference(91000005, "星光碎片")],
        cost: null,
        location: "练习镇 > 东门",
      },
      {
        id: "source-fragment",
        group: "其他来源",
        title: "练习宝箱",
        note: "这是候选产物，不能理解为每次必得。",
        products: [reference(91000005, "星光碎片", "1～3")],
        cost: null,
      },
    ],
  },
  {
    ...base(91000006, "清晨恢复药水", "consumable", [["potion", "药水"]]),
    description: "使用后恢复生命值。\n普通区域与 PVP 效果分别以对应说明为准。",
    buffs: [
      {
        name: "晨曦守护",
        description: "最大生命值 +5%\n持续 30 秒；仅普通区域生效。",
        target: "自身 · 普通区域",
      },
      {
        name: "晨曦守护（PVP）",
        description: "最大生命值 +1%\n持续 10 秒。",
        target: "自身 · PVP",
      },
    ],
    sources: [
      {
        id: "potion-shop",
        group: "其他来源",
        title: "药水商人 · 露米（演示）",
        route: { kind: "purchase", npc: { id: "demo-npc-lumi", name: "露米" } },
        location: "练习镇 → 广场",
        note: "菜单：恢复道具；售价与币种未收录。",
        cost: null,
      },
    ],
  },
  {
    ...base(91000007, "给远方旅行者的一封尚未寄出的很长很长的信", "quest", [
      ["story-quest", "剧情任务"],
      ["letter", "任务信件"],
    ]),
    quests: [
      {
        id: "demo-quest-01",
        name: "星光下的约定",
        role: "提交消耗",
        quantity: "1 封",
      },
    ],
    description:
      "把这封信交给旅行者。\n任务独立页面尚未接入；此处仅展示关系摘要。",
    flags: { trade: false, storage: true, destroy: null, auction: false },
  },
  {
    ...base(91000008, "小小星云猫", "pet", [["pet-companion", "伙伴"]]),
    color: "#b36dcf",
    stats: [{ label: "宠物技能等级", value: "1", unit: "Lv" }],
    effects: ["跟随时洒下星光（演示效果）。"],
    formations: Array.from({ length: 4 }, (_, i) => ({
      id: `demo-formation-${i + 1}`,
      name: i ? `加成方案 ${i + 1}` : "星夜同行",
      stats: [{ label: "力量", value: String(10 + i), unit: "点" }],
      effect: "阵容满足条件时生效。不是这只宠物单独触发，也不与其他方案累计。",
    })),
  },
  {
    ...base(91000009, "月光练习戒指", "equipment", [
      ["accessory", "饰品"],
      ["ring", "戒指"],
    ]),
    color: "#b36dcf",
    initial: true,
    stage: "初始",
    form: "普通",
    levels: { normal: 100 },
    stats: [{ label: "最大生命值", value: "100", unit: "点" }],
    set: {
      id: "demo-set-01",
      name: "月下旅人",
      tiers: [
        { count: 2, effects: ["最大生命值 +100 点"] },
        { count: 3, effects: ["力量 +15 点", "跳跃时出现月光（演示特效）。"] },
      ],
      members: [
        reference(91000009, "月光练习戒指"),
        { ...reference(91999991, "月光练习耳环"), available: false },
      ],
    },
  },
  {
    ...base(91000010, "微光练习宝石", "equipment", [
      ["battle", "战斗物品"],
      ["gem", "宝石"],
    ]),
    initial: true,
    levels: { transcend2: 0.01 },
    affixes: [
      { name: "力量", min: "2", max: "15", unit: "点", reference: "12.4" },
      { name: "冷却时间", min: "-2", max: "-1", unit: "秒", reference: "-1.2" },
      { name: "固定值示例", min: "0", max: "0", unit: "%", reference: "0" },
      { name: "单位尚未收录", min: "1", max: "10" },
    ],
    description:
      "仅展示初始候选池。最终洗练、镶嵌范围尚未核验。80% 为区间参考位置，不是概率或实例值。",
  },
  {
    ...base(91000011, "「星光见习生」称号学习书", "consumable", [
      ["title-book", "称号书"],
    ]),
    title: {
      name: "星光见习生",
      chance: "25%",
      stats: [{ label: "幸运", value: "5", unit: "点" }],
      effect: "称号展示特效（演示）。",
    },
    description:
      "本书的演示解锁成功率为 25%。\n此说明属于学习书，称号属性在上方单独展示。",
  },
  {
    ...base(91000012, "打瞌睡的小蘑菇", "pet", [["pet-companion", "伙伴"]]),
    formations: [],
    stats: [],
    description: "这个示例用于检查未收录阵容时的提示。",
  },
  {
    ...base(91000013, "褪色的旧纸片", "material", [["collectible", "收集品"]]),
    description: "",
    flags: { trade: null, storage: null, destroy: null, auction: null },
  },
  {
    ...base(91000014, "零门槛练习徽章", "equipment", [
      ["battle", "战斗物品"],
      ["badge", "徽章"],
    ]),
    initial: true,
    jobs: ["盾卫"],
    levels: { normal: 0, transcend1: 1000, transcend2: 0.01 },
    stats: [{ label: "固定加成", value: "0", unit: "%" }],
  },
  {
    ...base(91000015, "写满祝福的旅行点心", "consumable", [["food", "料理"]]),
    buffs: [
      { name: null, description: "已收录效果说明，名称暂缺。", target: "自身" },
      { name: "旅行的祝福", description: null, target: "自身" },
    ],
  },
  {
    ...base(91000016, "尚待辨识的碎屑", "material"),
    path: [],
    description: "分类尚未辨识；无分类选择时可以检索。",
  },
  {
    ...base(91000017, "清晨恢复药水", "consumable", [["potion", "药水"]]),
    description: "这是同名不同编号的演示记录，保留独立身份。",
  },
  {
    ...base(91000018, "古老星图中的第七块铭文碎片", "material", [
      ["craft-material", "制作材料"],
      ["special-material", "特殊材料"],
      ["ancient", "古代遗物"],
      ["starmap", "星图"],
      ["engraved", "铭文碎片"],
    ]),
  },
  {
    ...base(91000019, "未完成的旅行手记", "quest", [
      ["story-quest", "剧情任务"],
    ]),
    description: "未收录关联任务，不代表无法使用。",
  },
];
fs.writeFileSync(
  `${root}/items.json`,
  `${JSON.stringify({ kind: "visual-demo", notice: "演示资料：名称、数值、图标与关系均为样式样例，不代表游戏资料或全库查询。", items }, null, 2)}\n`,
);
const shapes = {
  equipment:
    '<path d="m13 35 22-23 5-1-1 5-22 23m-9-8 13 13M9 39l5 5M9 44l7-7"/>',
  consumable:
    '<path d="M20 8h12m-11 0v11L12 34a8 8 0 0 0 7 11h14a8 8 0 0 0 7-11l-9-15V8M15 31h23"/><path d="M23 24h6"/>',
  material:
    '<path d="m26 7 16 18-16 22L10 25 16 7Zm0 0-7 18 7 22 7-22Zm-16 18h32"/>',
  quest:
    '<path d="M16 9h22v32H16a5 5 0 0 1 0-10h22M16 9a5 5 0 0 0 0 10M20 20h12m-12 6h8m-12 5V9"/>',
  pet: '<path d="m12 14 3-6 9 7h5l9-7 3 7v18c0 14-29 14-29 0Zm9 15h1m9 0h1m-8 7 3 2 3-2"/>',
};
const colors = {
  equipment: "#bd528e",
  consumable: "#339b91",
  material: "#8b69bf",
  quest: "#b38b43",
  pet: "#568cc3",
};
for (const [category, shape] of Object.entries(shapes))
  fs.writeFileSync(
    `${root}/${category}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52"><g fill="none" stroke="${colors[category]}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${shape}</g></svg>\n`,
  );
console.log(`Created ${items.length} explicitly fictional display fixtures.`);
