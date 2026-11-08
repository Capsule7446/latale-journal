# 道具页面样式预览

日期：2026-11-08。范围为 [任务 02](../.scratch/static-items/issues/02-page-style.md)，不是 [真实静态资料任务 01](../.scratch/static-items/issues/01-static-item-detail.md)的完成证明。生产契约未冻结；只提供演示展示模型。

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

`npm run ci`：16 个规则／查询测试、类型检查与生产构建通过。`npm run test:browser`：6 组 Chromium 浏览器检查覆盖以下范围。浏览器测试访问静态 `dist/`，拦截业务 API 路径并确认没有业务请求；另主动阻断静态 JSON 请求检查真实失败与重试。

| 范围 | 实际核对与截图 |
| --- | --- |
| 桌面 1440px | 分栏、初始形态、版本切换、设置持久化、键盘焦点；[浅色](screenshots/page-style/desktop-light.png)、[深色紧凑](screenshots/page-style/desktop-dark-compact.png) |
| 320px | 无横向溢出、长名称／完整分类换行、完整觉醒候选、词条表、嵌套关系逐层返回、关系分页恢复、列表滚动及焦点恢复；[列表](screenshots/page-style/320-list.png)、[觉醒详情](screenshots/page-style/320-awakening.png)、[深层分类](screenshots/page-style/320-deep-filters.png)、[深色词条](screenshots/page-style/320-gem-dark.png) |
| 390px | 五类固定标签逐项打开、深层分类树、44px 点击高度；[筛选区](screenshots/page-style/390-filters.png)、[宠物阵容](screenshots/page-style/390-91000008.png) |
| 状态与输入 | 加载／失败／空结果／目标缺失／未缓存／版本移除；输入法合成后查询、220ms 停顿、非法等级保留输入、精确编号／同名记录、图片失败保留文字；[加载](screenshots/page-style/loading.png)、[失败](screenshots/page-style/error.png)、[空结果](screenshots/page-style/empty.png) |
| 设置与可访问性 | 浅／深／系统跟随、密度持久化、Escape 关闭与焦点回到按钮、标签方向键；[320px 手机设置](screenshots/page-style/320-settings-dark.png) |

完整即时截图及失败时 trace 保存到 `test-results/`，GitHub CI 上传为 `page-style-browser-evidence`。上表的代表截图随仓库提交，单独检出即可阅读。

## 后续对接边界

1. **身份与列表**：需要生产者提供实体类型＋业务编号、完整名称、稳定分类键及父关系、已核验名称色和图标地址。列表不增加等级、属性或来源计数。
2. **形态与条件**：需要已证普通／觉醒分段、各自初始形态及明确版本成员；职业成员、三种等级与独立三态特性。演示样例的显式关系不能证明全库分段能力。
3. **详情与关系**：需要原文、数值和单位、缺失语义、候选阶段、完整配方方向、来源数量／费用／条件及精确目标身份。生产中的 80% 计算、概率、价格、套装与阵容语义仍由正式契约验收；本预览中的数值是手填展示值。
4. **尚未接入**：正式 JSON Schema、真实资料与完整索引、跨资料版本切换、其他实体独立页、PWA、离线缓存和 Cloudflare 发布。“尚未缓存”“版本移除”仅为可观察的状态样式。

本次未恢复收藏、独立 NPC、词条或属性筛选、来源类型筛选等取消／暂缓项；未读取游戏档案，未修改相邻仓库，未合入 master、发布 Release 或部署生产。
