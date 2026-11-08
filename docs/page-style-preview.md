# 基础道具真实资料预览

更新日期：2026-11-09。当前验收对应 [真实资料任务 04](../.scratch/static-items/issues/04-data-only-preview.md)与[首条详情任务 01](../.scratch/static-items/issues/01-static-item-detail.md)。此前虚构预览已撤除，旧截图与演示状态不再作为当前页面证据。

## 来源与范围

全部游戏名称、说明、分类路径及状态只取自资料仓库固定出口。固定栏目、按钮和未接入提示属于 UI 文字。资料根由 `VITE_ITEMS_DATA_ROOT` 配置；未配置不请求资料，配置后请求失败属于错误，可重试。

契约固定为 `items-v1`，来源提交 `a2164a577833960489e06803aff462e341baa6dd`，内容 SHA-256 `18d1d91c8b452d6d310d57a2f64c575a0a5498f217aa0c3324c3fe501e392cfd`。CI 比对冻结提交中的文件字节及完整内容清单，生产者与消费者使用同一个 `assertDocument`。

## 已实现行为

1. 按 current → 不可变 manifest → items 读取静态文件；校验格式、路径、契约身份、大小、哈希、版本身份与覆盖数量／选择后整体展示。
2. 对整份已声明范围执行名称、精确 ID、可选原说明与分类过滤，再分页。测试子集明示范围，非 success 分类在任意分类筛选中排除。
3. 分类身份由完整键前缀构成；原说明直接作为文本展示，保留换行，不增加解释。缺失与未接入均不替换成零、否或没有来源。
4. 新包校验失败保留当前会话已验证版本；首次失败可重试。旧 `state` 参数不控制页面状态，未证筛选条件不参与结果计算。
5. 保留浅／深／系统外观、标准／紧凑密度、桌面分栏与手机返回。高级详情和途径折叠代码保留但不连接虚构资料。

## 验收记录

三份产物均由生产程序提交 `b426660df06944264947a6189a54bb0b42d1ef1d` 生成，输入 SHA-256 为 `66d536e41b46354745001d15edb83c0b2826daf7405eb61ec85b2a1403d67993`，范围统一为 `historical-sqlite-back-half-only`。完整名称、原说明及分类状态不经过人工补写。

| 产物 | 资料版本 | items 字节／SHA-256 |
| --- | --- | --- |
| 12 条真实子集，全量分母 85,158 | `a607da4dd24c06d01e68fe597ba525e1f8242d27db53ce58e0db286ddb62e4d0` | 4,770／`8308debc240e70bf0ec6885b73735bf4ab06f820e0babf472a8f3f9b492cb145` |
| 16 条真实子集，全量分母 85,158 | `067a2990e676f2ae224a009312883abcc96c523fc772755554086b14cfcdd7bf` | 6,346／`fc971767afde007f7153091cc684999aebd4717ac7701840ad8e27b75a018ede` |
| 85,158 条完整公开包 | `bdf835f885274c4157c34f3976e54317aaeb53623f83cf91737abddd5d9dff3d` | 36,302,154／`6e079d5880c906ec72b9e434bbbb0e1b3a898b3a7da1bdef632ecd6cdb8bc752` |

两份夹具包含指定编号、同名不同 ID、不同父路径下同子键、缺说明和缺分类；所有文件都从 data 出口原字节导入。协调会话另对完整包与已核验 `items.jsonl` 逐条严格比对：85,158 条的 id、name、description.status/value、category 各字段相等，未增加游戏文字；说明缺失 4,230 条，分类缺失 3,190 条。这项独立来源核对与前端结构／浏览器检查分别计数。

实际运行命令：

```powershell
node scripts/import-items-fixture.mjs "<data-export>/test-subset" items-v1
node scripts/import-items-fixture.mjs "<data-export>/test-subset-b" items-v1-b
npm run ci
npm run test:browser
node scripts/verify-full-items.mjs "<data-export>/full" http://127.0.0.1:4174/
```

33 项规则／查询／加载用例覆盖完整前缀分类、缺失排除、禁用条件的旧 URL、字节和哈希损坏、契约锁、版本身份、覆盖范围、取消，以及同一消费者读取两份真实包。9 项 Chromium 检查覆盖原文字段、精确编号、未接入、错误重试、更新失败保留旧版、同一 JS 构建从 12 条切换到 16 条、输入法、窄屏返回与外观持久化。旧演示 JSON／SVG 在开发和预览服务返回 410 且 no-store。

2026-11-09 02:44（Asia/Taipei），本机 Windows／Chromium 生产构建实测全量：85,158 条计数、编号 `84905009`、原说明严格相等、精确编号不扩展为前缀、缺分类清除／恢复、缺说明、1440px／320px 与返回通过；业务 API 请求为 0，页面异常为 0。新浏览器上下文首次进入至已验证资料展示为 **805ms**；编号输入至单条结果为 **315ms**，包含 220ms 输入等待。此为本机单次观察，不是网络速度或设备性能保证。[原始测量 JSON](evidence/items-v1-browser.json)保留资料身份及资源字节数。

| 全量页面 | 截图 |
| --- | --- |
| 1440px 列表与真实原说明 | [列表](screenshots/real-items/full-1440-list.png)／[详情](screenshots/real-items/full-1440-detail.png) |
| 320px 无横向溢出，完整原文 | [列表](screenshots/real-items/full-320-list.png)／[详情](screenshots/real-items/full-320-detail.png) |

## 复现与未覆盖

从单独检出到本地静态挂载的命令见 [README](../README.md)。开发端口为 4173，生产构建预览为 4174，自动浏览器验收为 4175。端口占用时退出，不停止别的服务。

当前只接基础编号、名称、原说明和已证分类状态。初始形态、属性、职业／等级、图标、Buff／套装、来源／用途、强化版本、其他板块、PWA、离线缓存与 Cloudflare 均不计入完成。真实包仍仅为历史 SQLite 的后半段验证，未证明客户端原始资源导入链。
