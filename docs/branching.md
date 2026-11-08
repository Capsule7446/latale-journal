# 分支、CI 与版本发布

2026-11-08 用户确认：主分支 `master`，普通开发 `feature`，大功能 `epic` 下拆多个 `feature`，修复 `hotfix`，发布 `release`。Git 分支不存在目录包含关系；以下命名与合并目标表达所属关系。

| 分支 | 建立来源 | 合并目标 |
| --- | --- | --- |
| `master` | 已验收发布 | 稳定主线；接收 `release/X.Y.Z` |
| `epic/<大功能>` | `master` | `release/X.Y.Z` |
| `feature/<功能>`；`feature/<epic>/<子功能>` | 独立功能从 `master`；子功能从所属 `epic` | 独立功能进入 `release`；子功能先回所属 `epic` |
| `hotfix/<修复>` | `master` | 对应补丁版本 `release/X.Y.Z` |
| `release/X.Y.Z` | `master`，汇集待发布的 feature/epic/hotfix | CI 与候选验收通过后回 `master` |

名称使用小写英文、数字和连字符。例：`epic/pwa` 下的 `feature/pwa/install`、`feature/pwa/offline-cache`。Git 的工作起点由建分支操作确定；CI 检查名称和 PR 合并方向，不冒称能从分支名称证明真实起点。master 的新修复同步到未完成的 epic/release，避免后续发布带回旧问题。

## 开发步骤

1. 从规定起点创建对应分支；大型功能先建 epic，再在其上分别创建 feature。
2. 完成范围内变更并运行 `npm run ci`；提交后推送，GitHub Actions 自动运行 CI。
3. 子 feature 汇入所属 epic；独立 feature、完成的 epic 和 hotfix 汇入目标 release。
4. 推送 release 触发 CI 和 Release；Release 在同一提交的 CI 成功后打包并发布 `vX.Y.Z-rc.<运行号>.<重跑号>` 预发布。
5. 候选通过验收后将 release 合入 master，再在该提交推送正式标签 `vX.Y.Z`；工作流再次运行 CI 并发布正式 GitHub Release。

正式标签必须位于远程 master 历史中，并包含同名 release 分支的提交；release 合入 master 使用保留祖先关系的合并，不做 squash/rebase，保留 release 分支供核验。标签创建后不挪动，已有版本不覆盖。常规合并不强制依赖 PR，但使用 PR 时 CI 会检查合并方向；仓库平台的强制保护规则与 CI 规则分别核对，不能把一次 CI 通过说成已启用强制保护。

## 当前自动化范围

本仓库已有独立运行的道具页面样式演示，尚无正式应用。当前 `npm run ci` 检查分支/PR 规则、文档链接、JSON、误入的本地资料、规则与查询用例、TypeScript 类型，并构建静态演示；GitHub CI 还运行 Chromium 浏览器验收。`source-baseline` Release 仍只包含工程源码 ZIP、提交清单和 SHA-256 校验文件，明确标记 `applicationReady: false`；不能作为正式应用发布。

代码迁入时同时补充真实测试、类型检查、构建和可部署产物校验，再升级打包脚本与产物类型；禁止只保留文档检查就宣称应用构建通过。GitHub Release 属于代码版本发布，Cloudflare 上线及游戏资料包更新仍按各自部署/资料规则执行。

手动验证打包：在 GitHub Actions 的 Release 工作流选择 `release/X.Y.Z`，保持 `publish=false`，得到 Actions 产物而不发布版本。本地在干净的 release 分支运行 `npm run release:package` 也只打包；产物写入被 Git 忽略的 `artifacts/`。

工作流默认只有读取权限；发布作业才有写入权限，PR 不进入发布作业。Release 内直接复用 CI，不依赖工作流自动创建标签后再次触发 CI。[GitHub 事件与令牌规则](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
