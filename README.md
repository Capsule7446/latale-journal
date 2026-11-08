# 彩虹岛手札（LaTale Journal）

彩虹岛 Wiki 的纯前端 PWA。应用部署到 Cloudflare，浏览器读取独立发布的静态 JSON 和图片，完成查询与展示。

**当前状态：仓库定义与开发约定已建立；正式应用、PWA 和 Cloudflare 部署尚未实现。** 本次不把现有依赖本机 API 的设计预览当作静态版迁入。

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

架构原因见 [ADR 0001](docs/adr/0001-two-repositories-static-wiki.md)。当前没有可运行的应用命令；首次静态链路完成后补充实际安装、开发、构建和验收命令。
