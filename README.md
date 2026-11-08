# 彩虹岛手札（LaTale Journal）

彩虹岛 Wiki 的纯前端工程。浏览器只读取独立发布的静态资料，不依赖业务查询 API、数据库或相邻仓库。

**当前范围：items-v1 基础道具加载、名称／精确编号／原说明搜索、分类与分页、基础详情。** 页面游戏内容只来自 `latale-wiki-data` 的固定产物。未配置资料入口时显示“资料未接入”；没有演示包或虚构回退。PWA、离线缓存、Cloudflare 部署与完整资料范围尚未完成。

## 启动

要求 Node.js 24 与 npm。单独检出本仓库后执行：

```powershell
npm ci
npm run dev
```

打开 [本地预览](http://127.0.0.1:4173/)。未配置数据根时可检查空状态与外观设置，不发送资料请求。端口固定为 4173；占用时退出，不停用其他服务。需要其他端口时执行 `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4176 --strictPort`。

## 接入真实静态资料

从资料仓库的固定出口获得**已验证的 items-v1 发布目录**，其根目录必须含 `current.json` 与 `versions/<dataVersion>/manifest.json`、`items.json`。这里不解析数据库、不导入游戏资源，也不生成业务样例。

```powershell
Copy-Item .env.example .env.local
```

将 `.env.local` 中的地址与目录改成实际出口位置，例如：

```dotenv
VITE_ITEMS_DATA_ROOT=/data/items-v1/
ITEMS_STATIC_DIRECTORY=D:/exports/items-v1
```

重新启动 `npm run dev`。`ITEMS_STATIC_DIRECTORY` 只给开发／预览服务提供只读静态文件挂载；不会打包游戏 JSON，也不会进入浏览器配置。不要提交 `.env.local` 或全量资料。已有独立静态主机时，只设置 `VITE_ITEMS_DATA_ROOT` 为该入口，跨域主机需允许本站读取。

配置写入构建 HTML 的 `items-data-root` 元信息，JS 不包含资料版本或全量资料。标准地址为 `/data/items-v1/current.json`。浏览器依次验证 pointer、manifest、items 的共用 Schema、冻结契约身份、字节数、SHA-256、资料版本与覆盖范围后整包展示；请求或校验失败可重试。点击“检查资料更新”重新读取入口，新包失败时保留本次会话已验证的旧版。

1. 名称支持字面包含、NFKC 与英文大小写归一；纯数字只精确查道具编号。同名不同编号分别保留。
2. “道具说明”勾选后搜索原说明；分类采用完整前缀身份，任何分类选择都排除整体分类非 success 的记录。
3. 原名称、说明及分类状态直接保留。缺说明显示“说明缺失”；未知后续分类显示“后续分类尚未辨识”。
4. 初始形态、等级、职业、特性、Buff、套装与途径尚未接入。相关筛选禁用，旧 URL 条件不参与查询；详情不会补造数值、布尔值或无来源结论。
5. 测试子集明确显示已选条数与全量分母，搜索只覆盖该子集。正式全量包的计数来自 manifest，不硬编码某个历史数量。

源码保留此前途径折叠组件与纯分组规则；基础页面不向其提供假数据。真实途径契约接入后再恢复该部分展示。

## 检查与构建

```powershell
npm run ci
npx playwright install chromium
npm run test:browser
npm run preview
```

`npm run ci` 检查契约生成文件、冻结提交与内容哈希、工程规则、真实夹具查询与拒绝用例、途径分组、TypeScript，并构建静态应用。CI 获取完整 Git 历史以核对冻结契约提交。

浏览器检查使用资料出口生成的真实测试包原字节；配置拦截仅切换静态地址，非法用例仅破坏原包结构／身份／字节。测试不手填游戏名称或说明。测试服务固定使用空闲端口 4175，启动和退出均由 Playwright 管理。截图与失败 trace 位于忽略的 `test-results/`；代表截图及资料身份见 [真实资料验收记录](docs/page-style-preview.md)。

提交的 12／16 条夹具由同一资料出口生成，经 `node scripts/import-items-fixture.mjs "<producer-release-directory>" items-v1` 原字节导入；第二份使用名称 `items-v1-b`。导入器先运行同一加载校验，拒绝将全量包作为测试夹具提交。当前验收为 33 项规则／查询／加载检查及 9 项浏览器检查。

`npm run build` 只产生应用文件到 `dist/`；全量 JSON 不进入 JS 或构建目录。`npm run preview` 在 [4174 端口](http://127.0.0.1:4174/)提供生产构建预览，可用同一静态挂载配置读取资料。资料生产与应用构建独立，兼容资料更新只切换数据入口。

配置全量真实包并启动生产预览后，可运行 `node scripts/verify-full-items.mjs "<full-producer-release-directory>" http://127.0.0.1:4174/` 重现全量计数、原文、缺失字段、分类与 320px 验收。当前已核对 85,158 条、36,302,154 字节的真实包；这是该输入的数量，不是前端常量。

当前没有 Service Worker、安装能力或已访问资料的离线保证。源码 Release 仍标记 `applicationReady: false`，本任务不发布 Release 或部署生产。现有真实包仅证明历史 SQLite 的后半段转换链，不能证明已从客户端原始资源重建。

## 开发入口

| 入口 | 范围 |
| --- | --- |
| [开发约定](docs/development.md) | 展示资料来源、纯静态边界与验收 |
| [数据契约](contracts/items-v1/README.md) | items-v1 字段语义、冻结身份、校验与版本 |
| [静态道具规格](.scratch/static-items/spec.md) | 完整已确认需求；基础接入不代表全 epic 完成 |
| [首条详情任务](.scratch/static-items/issues/01-static-item-detail.md)／[真实资料任务](.scratch/static-items/issues/04-data-only-preview.md) | 本次基础详情与撤除虚构资料 |
| [分支与发布](docs/branching.md)／[任务规则](docs/agents/issue-tracker.md) | feature/epic/release 及本仓库工作记录 |

`latale-journal` 维护前端及唯一 JSON 契约；`latale-wiki-data` 负责固定解析、转换、校验和发布。架构决定见 [ADR 0001](docs/adr/0001-two-repositories-static-wiki.md)，迁移约束见 [迁移边界](docs/migration.md)。
