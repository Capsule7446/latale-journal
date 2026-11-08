import type { ReactNode } from "react";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import type { ItemView, Reference, Relation } from "./display-model";
import type { Update } from "./navigation";
import { expandedRoutes, groupRoutes, toggleRoute } from "./routes";
import {
  CopyNames,
  Empty,
  ItemIcon,
  ItemName,
  Paged,
  Permissions,
  Stats,
  Tabs,
} from "./components";

type Props = {
  item: ItemView;
  items: ItemView[];
  params: URLSearchParams;
  update: Update;
  onOpen: (id: string) => void;
  back: () => void;
};
const descriptions = (item: ItemView) => (
  <p className="original-text">
    {item.description || <span className="muted">-（说明暂未收录）</span>}
  </p>
);

function ItemLink({
  reference,
  items,
  onOpen,
  params,
  focusKey,
}: {
  reference: Reference;
  items: ItemView[];
  onOpen: Props["onOpen"];
  params: URLSearchParams;
  focusKey: string;
}) {
  const target = items.find((item) => item.id === reference.id);
  const query = new URLSearchParams(params);
  query.set("item", reference.id);
  query.delete("tab");
  const available = reference.available !== false && target;
  return (
    <span className="reference">
      {available ? (
        <a
          id={`ref-${focusKey}`}
          href={`?${query}`}
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
              e.preventDefault();
              onOpen(reference.id);
            }
          }}
        >
          {reference.name}
          <ChevronRight aria-hidden="true" />
        </a>
      ) : (
        <span>
          {reference.name}
          <small className="muted"> · 目标未收录</small>
        </span>
      )}
      {reference.quantity && <small>× {reference.quantity}</small>}
    </span>
  );
}
function RelationCard({
  relation,
  props,
  scope,
  index,
}: {
  relation: Relation;
  props: Props;
  scope: string;
  index: number;
}) {
  const schemeKey = `${scope}-${encodeURIComponent(relation.id)}`;
  const link = (role: string) => (reference: Reference, index: number) => (
    <li key={`${reference.id}-${index}`}>
      <ItemLink
        reference={reference}
        focusKey={`${schemeKey}-${role}-${index}`}
        {...props}
      />
    </li>
  );
  return (
    <article
      className="relation-card route-scheme"
      aria-labelledby={`${schemeKey}-title`}
    >
      <span className="eyebrow">方案 {index + 1}</span>
      <h4 id={`${schemeKey}-title`}>{relation.title}</h4>
      {relation.input && (
        <div className="relation-input">
          {relation.route?.kind === "decomposition"
            ? "分解输入"
            : relation.route?.kind === "upgrade"
              ? "升级主道具"
              : "主道具"}
          ：
          <ItemLink
            reference={relation.input}
            focusKey={`${schemeKey}-input`}
            {...props}
          />
        </div>
      )}
      {relation.materials && (
        <section>
          <h5>材料</h5>
          <ul className="reference-list">
            {relation.materials.map(link("material"))}
          </ul>
        </section>
      )}
      {relation.products && (
        <section>
          <h5>产物</h5>
          <ul className="reference-list">
            {relation.products.map(link("product"))}
          </ul>
        </section>
      )}
      {relation.cost !== undefined && (
        <p className="muted">
          费用：{relation.cost === null ? "-" : `${relation.cost} Ely`}
        </p>
      )}
      {relation.condition && (
        <p className="muted">条件：{relation.condition}</p>
      )}
      {relation.location && <p>地点：{relation.location}</p>}
      {relation.note && <p className="original-text">{relation.note}</p>}
    </article>
  );
}
function Relations({
  props,
  direction,
}: {
  props: Props;
  direction: "sources" | "uses";
}) {
  const { item, params, update } = props;
  const rows = item[direction] || [];
  const incoming = direction === "sources";
  const groups = incoming
    ? [
        "制作",
        "升级",
        ...(rows.some((row) => row.group === "其他来源") ? ["其他来源"] : []),
      ]
    : ["全部", ...new Set(rows.map((row) => row.group))];
  const parameter = `${direction}-group`;
  const requested = params.get(parameter);
  const group =
    requested && groups.includes(requested)
      ? requested
      : incoming
        ? rows[0]?.group || groups[0]
        : groups[0];
  const selected = rows.filter(
    (row) => group === "全部" || row.group === group,
  );
  const prefix = `${item.id}-${direction}-`;
  const routes = groupRoutes(item.id, direction, selected);
  const expanded = expandedRoutes(params);
  return (
    <>
      <Tabs
        tabs={groups.map((group) => [group, group])}
        value={group}
        label={incoming ? "获取方式分组" : "用途分组"}
        onChange={(value) =>
          update({ [parameter]: value, [`${prefix}page`]: "1" })
        }
      />
      {routes.length ? (
        <Paged
          rows={routes.map((route) => {
            const scope = `route-${encodeURIComponent(route.key)}`;
            const open = expanded.includes(route.key);
            return (
              <section className="route-group" key={route.key}>
                <h3 className="route-heading">
                  <button
                    className="route-toggle"
                    type="button"
                    id={`${scope}-toggle`}
                    aria-expanded={open}
                    aria-controls={`${scope}-schemes`}
                    onClick={() =>
                      update({ "open-routes": toggleRoute(params, route.key) })
                    }
                  >
                    <span className="route-description">
                      {route.description}
                    </span>
                    <span className="route-count">
                      {route.schemes.length} 个方案
                    </span>
                    <ChevronDown aria-hidden="true" />
                  </button>
                </h3>
                {route.incomplete && (
                  <p className="route-incomplete muted">
                    途径资料不全，此方案单独显示。
                  </p>
                )}
                <div
                  className="route-schemes"
                  id={`${scope}-schemes`}
                  hidden={!open}
                >
                  {route.schemes.map((relation, index) => (
                    <RelationCard
                      key={relation.id}
                      relation={relation}
                      props={props}
                      scope={scope}
                      index={index}
                    />
                  ))}
                </div>
              </section>
            );
          })}
          params={params}
          update={update}
          prefix={prefix}
        />
      ) : (
        <Empty title={incoming ? "暂未收录此类来源" : "暂未收录此类用途"}>
          {incoming
            ? "没有收录来源，不代表无法获得。"
            : "没有用途记录，不代表无法使用。"}
        </Empty>
      )}
    </>
  );
}
function Attributes({ props }: { props: Props }) {
  const { item, items, update } = props;
  const versions = (item.versions || [])
    .map((id) => items.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is ItemView => !!candidate);
  return (
    <>
      {versions.length > 0 && (
        <section className="version-section">
          <div className="section-heading">
            <h3>强化版本</h3>
            <span className="muted">{item.form}版 · 各自保留初始形态</span>
          </div>
          <div className="stage-options" role="group" aria-label="强化版本">
            {versions.map((version) => (
              <button
                key={version.id}
                className="button"
                id={`stage-${version.id}`}
                aria-pressed={version.id === item.id}
                onClick={() => update({ item: version.id })}
              >
                {version.stage}
              </button>
            ))}
          </div>
        </section>
      )}
      {(item.jobs || item.levels) && (
        <dl className="requirements" aria-label="使用要求">
          {item.jobs && (
            <div>
              <dt>职业条件</dt>
              <dd>{item.jobs.join("、")}</dd>
            </div>
          )}
          {item.levels?.normal !== undefined && (
            <div>
              <dt>普通等级</dt>
              <dd>{item.levels.normal}</dd>
            </div>
          )}
          {item.levels?.transcend1 !== undefined && (
            <div>
              <dt>超越Ⅰ</dt>
              <dd>{item.levels.transcend1}</dd>
            </div>
          )}
          {item.levels?.transcend2 !== undefined && (
            <div>
              <dt>超越Ⅱ</dt>
              <dd>{item.levels.transcend2}</dd>
            </div>
          )}
        </dl>
      )}
      <section>
        <h3>基础属性</h3>
        <Stats rows={item.stats || []} />
      </section>
      {!!item.effects?.length && (
        <section>
          <h3>装备特效</h3>
          {item.effects.map((effect, i) => (
            <p className="original-text" key={i}>
              {effect}
            </p>
          ))}
        </section>
      )}
      {!!item.affixes?.length && (
        <section>
          <h3>普通词条候选</h3>
          {item.affixes.some((affix) => affix.min !== undefined) ? (
            <>
              <p className="muted">初始候选池 · 80% 是区间参考位置，非概率。</p>
              <table className="affix-table">
                <thead>
                  <tr>
                    <th>词条</th>
                    <th>最小</th>
                    <th>最大</th>
                    <th>80%</th>
                  </tr>
                </thead>
                <tbody>
                  {item.affixes.map((affix, i) => (
                    <tr key={i}>
                      <th scope="row">
                        {affix.name}
                        <small>{affix.unit || "单位暂缺"}</small>
                      </th>
                      <td>{affix.min ?? "-"}</td>
                      <td>{affix.max ?? "-"}</td>
                      <td
                        title={
                          !affix.unit ? "缺少单位，无法给出参考值" : undefined
                        }
                      >
                        {affix.reference ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <ul className="affix-list">
              {item.affixes.map((affix, i) => (
                <li key={i}>{affix.name}</li>
              ))}
            </ul>
          )}
        </section>
      )}
      {!!item.awakening?.length && (
        <section>
          <h3>武器觉醒词条</h3>
          <p className="muted">候选阶段与强化版本独立；各阶段完整展开。</p>
          {item.awakening.map((stage) => (
            <section className="awakening-stage" key={stage.stage}>
              <h4>{stage.stage}</h4>
              <ul>
                {stage.candidates.map((candidate, i) => (
                  <li key={i}>{candidate}</li>
                ))}
              </ul>
            </section>
          ))}
        </section>
      )}
      <section className="item-notes">
        <h3>道具说明</h3>
        {descriptions(item)}
      </section>
      <Permissions item={item} />
    </>
  );
}
function Effects({ item }: { item: ItemView }) {
  return (
    <>
      {item.title && (
        <section>
          <h3>对应称号 · {item.title.name}</h3>
          <p className="title-chance">
            本书解锁成功率 <strong>{item.title.chance ?? "-"}</strong>
          </p>
          <Stats rows={item.title.stats} />
          <p className="original-text">{item.title.effect}</p>
          <p className="muted">称号独立页面尚未接入。</p>
        </section>
      )}
      {!!item.buffs?.length && (
        <section>
          <div className="section-heading">
            <h3>关联 Buff</h3>
            <CopyNames
              names={item.buffs.flatMap((buff) =>
                buff.name ? [buff.name] : [],
              )}
            />
          </div>
          {item.buffs.map((buff, index) => (
            <article className="buff-row" key={index}>
              <div>
                <small className="muted">{buff.target}</small>
                <h4>{buff.name ?? "-（名称暂缺）"}</h4>
                <p className="original-text">
                  {buff.description ?? "-（说明暂缺）"}
                </p>
              </div>
              {buff.name && <CopyNames names={[buff.name]} label="复制名称" />}
            </article>
          ))}
        </section>
      )}
      <section>
        <h3>道具使用说明</h3>
        {descriptions(item)}
      </section>
      <Permissions item={item} />
    </>
  );
}

export function ItemDetails(props: Props) {
  const { item, params, update, back } = props;
  const hasSet = !!item.set;
  const tabs: [string, string][] =
    item.category === "equipment"
      ? [
          ["attributes", "属性"],
          ...(hasSet ? [["set", "套装"] as [string, string]] : []),
          ["sources", "获取方式"],
          ["uses", "用途"],
        ]
      : item.category === "consumable"
        ? [
            ["effects", "使用效果"],
            ["sources", "获取方式"],
          ]
        : item.category === "quest"
          ? [
              ["description", "道具说明"],
              ["quests", "关联任务"],
              ["uses", "材料用途"],
              ["sources", "获取方式"],
            ]
          : item.category === "pet"
            ? [
                ["attributes", "属性"],
                ["sources", "获取方式"],
                ["formations", "配合的阵容"],
              ]
            : [
                ["description", "道具说明"],
                ["uses", "材料用途"],
                ["sources", "获取方式"],
              ];
  const requested = params.get("tab");
  const tab = tabs.some(([key]) => key === requested) ? requested! : tabs[0][0];
  let content: ReactNode;
  if (tab === "attributes") content = <Attributes props={props} />;
  else if (tab === "effects") content = <Effects item={item} />;
  else if (tab === "description")
    content = (
      <>
        <section>
          <h3>道具说明</h3>
          {descriptions(item)}
        </section>
        <Permissions item={item} />
      </>
    );
  else if (tab === "sources" || tab === "uses")
    content = <Relations props={props} direction={tab} />;
  else if (tab === "set" && item.set)
    content = (
      <>
        <section>
          <h3>{item.set.name}</h3>
          <p className="muted">
            套装 #{item.set.id} · 各档效果分别显示，不累加。
          </p>
        </section>
        {item.set.tiers.map((tier) => (
          <section key={tier.count}>
            <h3>{tier.count} 件效果</h3>
            {tier.effects.map((effect, i) => (
              <p className="original-text" key={i}>
                {effect}
              </p>
            ))}
          </section>
        ))}
        <section>
          <h3>套装成员</h3>
          <ul className="reference-list">
            {item.set.members.map((member) => (
              <li key={member.id}>
                <ItemLink
                  reference={member}
                  focusKey={`set-${item.set!.id}-${member.id}`}
                  {...props}
                />
              </li>
            ))}
          </ul>
        </section>
      </>
    );
  else if (tab === "quests")
    content = item.quests?.length ? (
      <>
        {item.quests.map((quest) => (
          <article className="relation-card" key={quest.id}>
            <span className="eyebrow">{quest.role}</span>
            <h3>{quest.name}</h3>
            <p>数量：{quest.quantity}</p>
            <p className="muted">关联任务页面尚未接入。</p>
          </article>
        ))}
      </>
    ) : (
      <Empty title="暂未收录关联任务">保留道具记录，等待后续资料接入。</Empty>
    );
  else if (tab === "formations")
    content = item.formations?.length ? (
      <Paged
        params={params}
        update={update}
        prefix={`${item.id}-formations-`}
        sizes={[3, 5, 10]}
        rows={item.formations.map((formation) => (
          <article className="relation-card" key={formation.id}>
            <h3>{formation.name}</h3>
            <Stats rows={formation.stats} />
            <p className="original-text">{formation.effect}</p>
          </article>
        ))}
      >
        <p className="muted">按加成方案展示，不展开六宠组合。</p>
      </Paged>
    ) : (
      <Empty title="暂未收录配合的阵容">不代表这只宠物没有阵容加成。</Empty>
    );
  return (
    <div className="detail-inner">
      <button className="button back-button" onClick={back}>
        <ArrowLeft />
        返回
        {history.state?.journal?.fromItem ||
        (history.state?.journal?.depth || 0) > 1
          ? "上一页"
          : "列表"}
      </button>
      <header className="detail-heading">
        <ItemIcon item={item} />
        <div>
          <span className="eyebrow">
            道具 #{item.id}
            {item.form && ` · ${item.form}版`}
          </span>
          <h2 id="detail-title" tabIndex={-1}>
            <ItemName item={item} />
          </h2>
          <p className="category-path">
            {item.path.length
              ? item.path.map((node) => node.label).join(" / ")
              : "分类尚未辨识"}
          </p>
        </div>
      </header>
      <Tabs
        tabs={tabs}
        value={tab}
        label="道具详情标签"
        onChange={(value) => update({ tab: value })}
      />
      <div
        className="detail-body"
        role="tabpanel"
        aria-label={tabs.find(([key]) => key === tab)?.[1]}
      >
        {content}
      </div>
    </div>
  );
}
