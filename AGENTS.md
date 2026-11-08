# Agent instructions

使用简体中文，结论先行，输出简洁。修改前读取对应文件；不得回滚其他协作者的修改。

1. 规划或修改前端、PWA、数据加载及应用发布前，阅读 `docs/development.md`；当前仓库处于定义阶段，不能声称应用已实现。
2. 定义字段、索引或版本兼容前，阅读 `docs/data-contract.md` 和 `contracts/README.md`。本仓库是 JSON 契约的唯一维护来源。
3. 创建或更新任务前，阅读 `docs/agents/issue-tracker.md`。本仓库自行保存规格，不以父工作区的任务目录作为持续依赖。
4. 讨论领域或架构前，阅读本仓库 `GLOSSARY.md` 及相关 `docs/adr/`；迁移旧设计、代码或资料前阅读 `docs/migration.md`。
5. 正式浏览器只消费静态资源；新增功能须在查询 API 不可达时验收。资料生产规则归 `latale-wiki-data`，不在组件内复制解析规则或运行 AI。
