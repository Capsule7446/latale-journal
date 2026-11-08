# 道具页面样式预览

更新日期：2026-11-09。范围为 [页面样式任务 02](../.scratch/static-items/issues/02-page-style.md)与[途径折叠任务 03](../.scratch/static-items/issues/03-collapsed-routes.md)，不是 [真实静态资料任务 01](../.scratch/static-items/issues/01-static-item-detail.md)的完成证明。生产契约未冻结；只提供演示展示模型。

## 运行与入口

在本仓库根目录执行 `npm ci`、`npm run dev`，打开 [http://127.0.0.1:4173/](http://127.0.0.1:4173/)。交付时此地址已启动；日志在忽略的 `.runtime/preview.log`，进程编号在 `.runtime/preview.pid`。重启电脑后需重新执行启动命令。端口冲突会明确失败，不自动换端口或停止已有服务。

| 场景 | 预览入口 |
| --- | --- |
| 普通／觉醒与强化版本 | [普通初始](http://127.0.0.1:4173/?item=91000001)、[觉醒初始与三阶段候选](http://127.0.0.1:4173/?item=91000003) |
| 五类固定标签 | [装备套装](http://127.0.0.1:4173/?item=91000009&tab=set)、[消耗 Buff](http://127.0.0.1:4173/?item=91000006)、[其他材料](http://127.0.0.1:4173/?item=91000005&tab=uses)、[任务长名称](http://127.0.0.1:4173/?item=91000007)、[宠物阵容](http://127.0.0.1:4173/?item=91000008&tab=formations) |
| 多层路径／不同单位 | [六层分类](http://127.0.0.1:4173/?item=91000018)、[词条零值／负值／未知单位](http://127.0.0.1:4173/?item=91000010) |
| 主要状态 | [加载](http://127.0.0.1:4173/?state=loading)、[读取失败](http://127.0.0.1:4173/?state=error)、[空结果](http://127.0.0.1:4173/?state=empty)、[目标缺失](http://127.0.0.1:4173/?state=missing)；其他状态在页头选择 |

## 采用的已确认基础

只读核对旧工作区 `latale-wiki-frontend/design/shadcn-component-preview/` 的 `item-detail-design.md`（2026-10-22 整体通过）、`src/ItemCatalog.tsx`、`src/ItemDetails.tsx`、`src/preview.css`、`src/item-catalog.css` 与 `src/item-details.css`。2026-11-08 的本仓库 [规格](../.scratch/static-items/spec.md)优先于旧预览中的合并逻辑或额外词条主标签。

保留 React / TypeScript / Vite、V4.1 色值、1600px 最大宽度、自然滚动、蓝色下划线标签、内容宽度 1024px 分栏断点、浅深外观、标准／紧凑密度，以及四项特性中允许为粉色、未知与禁止为灰色的表达。表单使用原生 HTML 控件、对话框与可键盘切换的标签；未复制旧服务端请求或其他板块组件。

`src/demo-model.ts` 是演示展示模型；`public/demo/items.json` 在运行时请求，不编入 JS。19 条虚构样例的默认初始形态结果为 17 条，名称、编号、数值、关系、图标均明确为演示。`scripts/create-demo.mjs` 是可复现的手工样例编排器，不读取客户端资料、不承担资料解析。SVG 为本任务绘制的品类占位图；没有将其冒充游戏图标。

## 验收证据

`npm run ci`：25 个规则／查询／途径分组测试、类型检查与生产构建通过。`npm run test:browser`：10 组 Chromium 浏览器检查覆盖以下范围及途径折叠。浏览器测试访问静态 `dist/`，拦截业务 API 路径并确认没有业务请求；另主动阻断静态 JSON 请求检查真实失败与重试。

| 范围 | 实际核对与截图 |
| --- | --- |
| 桌面 1440px | 分栏、初始形态、版本切换、设置持久化、键盘焦点；[浅色](screenshots/page-style/desktop-light.png)、[深色紧凑](screenshots/page-style/desktop-dark-compact.png) |
| 320px | 无横向溢出、长名称／完整分类换行、完整觉醒候选、词条表、嵌套关系逐层返回、关系分页恢复、列表滚动及焦点恢复；[列表](screenshots/page-style/320-list.png)、[觉醒详情](screenshots/page-style/320-awakening.png)、[深层分类](screenshots/page-style/320-deep-filters.png)、[深色词条](screenshots/page-style/320-gem-dark.png) |
| 390px | 五类固定标签逐项打开、深层分类树、44px 点击高度；[筛选区](screenshots/page-style/390-filters.png)、[宠物阵容](screenshots/page-style/390-91000008.png) |
| 状态与输入 | 加载／失败／空结果／目标缺失／未缓存／版本移除；输入法合成后查询、220ms 停顿、非法等级保留输入、精确编号／同名记录、图片失败保留文字；[加载](screenshots/page-style/loading.png)、[失败](screenshots/page-style/error.png)、[空结果](screenshots/page-style/empty.png) |
| 设置与可访问性 | 浅／深／系统跟随、密度持久化、Escape 关闭与焦点回到按钮、标签方向键；[320px 手机设置](screenshots/page-style/320-settings-dark.png) |

完整即时截图及失败时 trace 保存到 `test-results/`，GitHub CI 上传为 `page-style-browser-evidence`。上表的代表截图随仓库提交，单独检出即可阅读。

## 途径默认折叠与多方案（2026-11-09）

[材料用途入口](http://127.0.0.1:4173/?item=91000005&tab=uses)包含 7 份演示方案，按明确途径身份分为 6 组，默认每页 5 组。首次进入各组收起；只在展开后显示材料、产物、数量、费用、地点与条件。同一 NPC 的两份方案在原始数组中不相邻，也只形成一条 `[兑换]阿洛` 外层入口，另一位 NPC 使用不同的演示姓名“米娜”。同名不同身份和缺身份的反例仅放入规则测试及浏览器拦截响应，不干扰正常预览；这些记录仍必须独立，不按名字合并。

| 场景 | 验收与截图 |
| --- | --- |
| 五种外层描述 | 兑换、购买、生活技能、分解、升级均有独立描述；生活技能完整使用用户例子 `[吉恩蒂亚成品][Lv1]成品制造 > 拳套`。桌面[折叠](screenshots/collapsed-routes/routes-desktop-collapsed.png)与[展开](screenshots/collapsed-routes/routes-desktop-alternatives.png) |
| 320px 与深色 | 完整描述换行，点击目标至少 44px，无横向溢出；[折叠](screenshots/collapsed-routes/routes-320-collapsed.png)、[独立材料方案](screenshots/collapsed-routes/routes-320-alternatives.png)、[深色](screenshots/collapsed-routes/routes-320-dark.png) |
| 获取方向 | [获取方式入口](http://127.0.0.1:4173/?item=91000005&tab=sources)将同 NPC 的两份兑换方案放入一个入口，各自产出当前道具；[获取多方案](screenshots/collapsed-routes/routes-acquisition-alternatives.png) |
| 状态恢复 | Space／Enter 展开与收起；独立组互不关闭。材料跳转、页内返回与浏览器后退恢复原展开、关系页码、滚动和精确链接焦点；刷新也从 URL 恢复展开与关系页码 |

`src/routes.ts` 仅把明示展示身份组织为途径组，不解析客户端字段，不合并方案内容。稳定键包含当前道具、关系方向、途径类型与 NPC／生活技能类别＋等级＋完整路径／分解或升级主输入身份；名字不参与判断相等。`open-routes` 保存这些键，分组之后再传入已有分页器；相同 NPC 的获取和用途展开状态互不影响。缺身份时使用单份方案身份保留独立记录，不按标题猜关系。直接从详情链接进入再追查材料时，返回按钮也正确显示“返回上一页”。

新增 9 个分组规则用例与 4 组浏览器回归（含测试专用同名／缺身份数据）；原有 6 组页面检查继续通过。所有路线字段、NPC 和材料方案均为明确标记的手工演示资料；生活技能例子只证明布局符合用户要求，不证明已经解析出游戏字段。

## 后续对接边界

1. **身份与列表**：需要生产者提供实体类型＋业务编号、完整名称、稳定分类键及父关系、已核验名称色和图标地址。列表不增加等级、属性或来源计数。
2. **形态与条件**：需要已证普通／觉醒分段、各自初始形态及明确版本成员；职业成员、三种等级与独立三态特性。演示样例的显式关系不能证明全库分段能力。
3. **详情与关系**：需要原文、数值和单位、缺失语义、候选阶段、完整配方方向、来源数量／费用／条件及精确目标身份。途径还需真实 NPC 身份、生活技能类别／等级／完整路径身份及明确主输入；未知身份不能按名称补齐。生产中的 80% 计算、概率、价格、套装与阵容语义仍由正式契约验收；本预览中的数值是手填展示值。
4. **尚未接入**：正式 JSON Schema、真实资料与完整索引、跨资料版本切换、其他实体独立页、PWA、离线缓存和 Cloudflare 发布。“尚未缓存”“版本移除”仅为可观察的状态样式。

本次未恢复收藏、独立 NPC、词条或属性筛选、来源类型筛选等取消／暂缓项；未读取游戏档案，未修改相邻仓库，未合入 master、发布 Release 或部署生产。
