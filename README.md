# 彩虹岛手札（LaTale Journal）

彩虹岛 Wiki 的纯前端 PWA。应用部署到 Cloudflare，浏览器读取独立发布的静态 JSON 和图片，完成查询与展示。

**当前状态：开发约定、分支规范、CI 与工程源码 Release 已配置；正式应用、PWA 和 Cloudflare 部署尚未实现。** 工程基线版本不代表可运行应用。

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

当前使用 Node.js 24，无需安装 npm 依赖；运行 `npm run ci` 校验工程基线。正式应用命令在首次静态链路完成后补充。Release 当前提供源码、版本清单与校验文件，不是应用构建产物。

## 当前开发入口

`epic/static-items` 已开始迁入 [静态道具需求](.scratch/static-items/spec.md)，实施顺序见 [首条静态链](.scratch/static-items/plan.md)。第一条功能是读取真实静态道具详情；先由资料仓库完成基础字段核验，再冻结契约并实现页面。当前迁入的是需求与任务，尚无可运行的新前端。
