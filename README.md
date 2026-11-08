# 彩虹岛手札（LaTale Journal）

彩虹岛 Wiki 的纯前端 PWA。应用部署到 Cloudflare，浏览器读取独立发布的静态 JSON 和图片，完成查询与展示。

**当前状态：道具页面样式预览可独立运行，使用 19 条明确标注的演示资料。正式资料接入、PWA 和 Cloudflare 部署尚未实现。** 演示不代表正式应用或全库查询完成。

## 启动样式预览

要求 Node.js 24 与 npm。单独检出本仓库后，在仓库根目录运行：

```powershell
npm ci
npm run dev
```

打开 [本地预览](http://127.0.0.1:4173/)。端口固定为 4173；若已被占用，命令会退出，不停用其他服务。可显式指定空闲端口：`node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4176 --strictPort`。

浏览器只读取本仓库的 `/demo/items.json` 与本地图标；不需要相邻仓库、Go/Bun 查询 API、数据库或游戏档案。演示包是手工编排的视觉样例，不能用于推导真实数值、关系、解析能力或生产契约。

1. 默认列表显示 17 条初始形态样例；取消“只看初始状态”可查看全部 19 条。
2. 点击五个品类中的道具，检查固定标签、来源／用途及强化切换；窄屏用“返回列表”恢复检索位置。
3. 页头“显示设置”切换浅／深／系统外观与标准／紧凑密度；“预览状态”可固定显示加载、失败、空结果等状态。

截图、复现入口和待对接字段见 [页面样式验收记录](docs/page-style-preview.md)。

## 检查与构建

```powershell
npm run ci
npx playwright install chromium
npm run test:browser
npm run preview
```

`npm run ci` 执行工程检查、16 个规则／查询用例、TypeScript 检查和 Vite 构建。`npm run test:browser` 使用构建后的静态产物，自动在 4175 端口启动并结束测试服务；运行前需完成构建且端口空闲。结果和截图保存在忽略的 `test-results/`；已验收截图另存于仓库文档中。GitHub CI 安装 Chromium 并运行同一套浏览器检查。

`npm run preview` 在 [4174 端口](http://127.0.0.1:4174/)提供 `dist/` 静态构建预览；`npm run build` 可单独重建。当前构建仅为样式演示，不包含 Service Worker、安装能力或离线缓存。源码 Release 仍标记 `applicationReady: false`；本任务不发布 Release 或部署生产。

## 两个仓库

| 仓库 | 职责 |
| --- | --- |
| `latale-journal`（本仓库） | 前端、搜索与交互、PWA、JSON 契约、应用构建与部署 |
| `latale-wiki-data` | 客户端资料解析、转换、校验、静态包生成与资料发布 |

两者通过版本化的数据契约与静态发布产物衔接；任一仓库都可单独检出，不以相邻目录、开发者电脑或查询 API 作为线上依赖。

## 开发入口

1. 阅读 [开发约定](docs/development.md)，确定本仓库负责的行为及验收。
2. 修改数据字段前阅读 [数据契约协作](docs/data-contract.md)；正式契约从 [contracts](contracts/README.md)维护。
3. 需求与任务按 [任务规则](docs/agents/issue-tracker.md)保存在本仓库；迁移已有内容先看 [迁移边界](docs/migration.md)。

架构原因见 [ADR 0001](docs/adr/0001-two-repositories-static-wiki.md)。主分支为 `master`，开发、集成与发布遵循 [分支及 CI 规范](docs/branching.md)。

React、TypeScript 与 Vite 版本由 `package-lock.json` 固定。已确认布局沿用旧预览的视觉基础，正式业务契约仍由 `contracts/` 独立维护。

## 当前开发入口

`epic/static-items` 已迁入 [静态道具需求](.scratch/static-items/spec.md)，实施顺序见 [首条静态链](.scratch/static-items/plan.md)。[页面样式任务 02](.scratch/static-items/issues/02-page-style.md)独立交付演示预览；[真实资料任务 01](.scratch/static-items/issues/01-static-item-detail.md)仍等待资料能力核验与正式契约，不能用本预览的验收结果替代。
