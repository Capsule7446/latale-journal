# items-v1：真实基础道具静态包

唯一来源为本目录；生产者锁定前端提交和契约文件内容 SHA-256。Schema 是 [schema.json](schema.json)，两侧共用 [validate.mjs](validate.mjs) 的结构与业务校验；生成的类型不另行手改。

## 范围与含义

全部公开道具按数值 ID 升序且唯一，保留同名不同 ID。`name` 取核验产物的 name.value；`description` 取其原说明解码结果与状态，不新增或改写文字。缺说明用 `missing` 和空字符串，不表示游戏没有效果。

`category` 保留已证路径每段 key/label/status 以及整体状态、后继边界。根键为 equipment、consumables、other、quests、pets；前端可映射为固定导航标签。节点身份为整个前缀路径，不能将不同父节点下同一 key 合并。status=success 只证明已有路径；continuation=unresolved 不表示末级已完全识别。任何分类筛选排除整体非 success，道具仍可在未选分类时查到。

首版只接受输入核验已证的 success/missing 状态；整体 success 当且仅当所有路径段成功，否则整体 missing 且后继边界必须 unresolved。其他解析状态的聚合语义尚未核验，不能静默转换成 missing 或写入本格式。

此版本未提供初始形态、等级、属性、图标、Buff、套装与途径；前端保持未接入并禁用相关筛选，不能用名称猜测或写入假默认值。新增能力另走契约验证，不把本版本当成完整 Wiki 或 PWA 契约。

## 静态地址与版本

相对配置的数据根（推荐 `/data/items-v1/`）读取 `current.json`。pointer 指向 `versions/<dataVersion>/manifest.json`，manifest 指向同目录 `items.json`。路径仅允许 Schema 中的固定形式，不接受任意 URL、父目录或跨域引用。

1. items 文件为 `{formatVersion,items}`，UTF-8 JSON；完整公开包的 coverage.kind=full-public。测试包由同一生产入口确定性选取真实编号，kind=producer-test-subset，selection 保存全部升序编号，fullPublicCount 保存全量分母。页面须明示测试范围。
2. manifest 记录契约身份、生产程序 Git 提交、输入 SHA-256 与历史 SQLite 后半段范围。公开产物不含私有数据库路径、表/行证据或日志。
3. dataVersion 为 `SHA256(UTF8(releaseIdentity(manifest)))`，releaseIdentity 排除 dataVersion 本身，按键排序；manifest 的 items SHA-256 是实际文件字节哈希。pointer 同样记录 manifest 字节哈希及大小。
4. 生产者完整验证候选版本后写入不可变目录；同路径不同内容拒绝覆盖，最后原子切换 current。消费者逐层验证格式、受信契约身份、路径、字节长度、哈希、dataVersion 与覆盖计数后才整体展示；失败不得渲染部分新包或虚构回退。

## 契约内容身份

运行 `node contracts/items-v1/build.mjs` 生成类型并执行结构自检；运行 `node contracts/items-v1/build.mjs --check` 检查生成文件未漂移。契约固定文件清单为 schema.json、validate.mjs、validate.d.mts、types.d.ts、README.md、build.mjs。

对上述文件名按 ASCII 排序，分别计算原始字节 SHA-256，形成每行 `<文件SHA256>  <文件名>\n`，再对整个 UTF-8 文本计算 SHA-256，得到契约内容身份。来源提交另外锁定，不写入本目录以免自引用。发布/消费工具必须核验该清单及提交中的字节；不可只信任版本名称。

真实合法样本由资料仓库出口生成后加入前端测试夹具；非法用例从真实包修改结构、身份或文件字节验证拒绝。Schema 可用标准 JSON Schema 2020-12 验证器加载 `$defs`；共用校验器只解释本 Schema 实际使用的关键词，遇到未知关键词拒绝。
