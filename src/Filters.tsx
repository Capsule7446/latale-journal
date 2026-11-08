import {
  ChevronDown,
  ChevronRight,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CategoryNode, DemoItem } from "./demo-model";
import { flagLabels, levelFields } from "./demo-model";
import { categoryTree, rangeError, values } from "./catalog";
import { CheckLabel } from "./components";
import type { Patch, Update } from "./navigation";

function Tree({
  nodes,
  selected,
  expanded,
  select,
  expand,
}: {
  nodes: CategoryNode[];
  selected: string[];
  expanded: string[];
  select: (key: string) => void;
  expand: (key: string) => void;
}) {
  return (
    <ul className="category-tree">
      {nodes.map((node) => (
        <li key={node.key}>
          <div className="category-node">
            {node.children.length ? (
              <button
                className="icon-button tree-toggle"
                aria-label={`${expanded.includes(node.key) ? "收起" : "展开"}${node.label}`}
                aria-expanded={expanded.includes(node.key)}
                onClick={() => expand(node.key)}
              >
                {expanded.includes(node.key) ? (
                  <ChevronDown />
                ) : (
                  <ChevronRight />
                )}
              </button>
            ) : (
              <span className="tree-spacer" />
            )}
            <CheckLabel
              checked={selected.includes(node.key)}
              onChange={() => select(node.key)}
            >
              {node.label}
            </CheckLabel>
          </div>
          {node.children.length > 0 && expanded.includes(node.key) && (
            <Tree
              nodes={node.children}
              selected={selected}
              expanded={expanded}
              select={select}
              expand={expand}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export function Filters({
  items,
  params,
  update,
}: {
  items: DemoItem[];
  params: URLSearchParams;
  update: Update;
}) {
  const query = params.get("q") || "";
  const [draft, setDraft] = useState(query);
  const [composing, setComposing] = useState(false);
  const latestUpdate = useRef(update);
  latestUpdate.current = update;
  useEffect(() => setDraft(query), [query]);
  useEffect(() => {
    if (composing || draft === query) return;
    const timer = setTimeout(
      () => latestUpdate.current({ q: draft, page: "1" }),
      220,
    );
    return () => clearTimeout(timer);
  }, [draft, composing, query]);
  const selected = values(params, "cats"),
    expanded = values(params, "tree");
  const filter = (patch: Patch) => update({ ...patch, page: "1" });
  const toggle = (key: string, group: string[]) =>
    group.includes(key)
      ? group.filter((value) => value !== key)
      : [...group, key];
  const invalid = rangeError(params);
  return (
    <section className="search-area" aria-label="搜索与筛选">
      <div className="page-heading">
        <h1>道具图鉴</h1>
        <p>浏览道具，查看属性、来源和用途。</p>
      </div>
      <form
        className="search-box"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (!composing) filter({ q: draft });
        }}
      >
        <Search aria-hidden="true" />
        <input
          id="item-search"
          aria-label="搜索道具名称或精确编号"
          placeholder="搜索名称 / 精确道具编号"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={(event) => {
            setComposing(false);
            setDraft(event.currentTarget.value);
          }}
        />
        {draft && (
          <button
            className="icon-button"
            type="button"
            aria-label="清空搜索"
            onClick={() => {
              setDraft("");
              filter({ q: null });
              document.getElementById("item-search")?.focus();
            }}
          >
            <X />
          </button>
        )}
      </form>
      <div className="search-scopes">
        <span className="muted">同时搜索</span>
        {[
          ["desc", "道具说明"],
          ["buff", "Buff名称与说明"],
          ["setname", "套装名称"],
        ].map(([key, label]) => (
          <CheckLabel
            key={key}
            checked={params.get(key) === "1"}
            onChange={(checked) => filter({ [key]: checked ? "1" : null })}
          >
            {label}
          </CheckLabel>
        ))}
      </div>
      <div className="initial-filter">
        <CheckLabel
          checked={params.get("initial") !== "0"}
          onChange={(checked) => filter({ initial: checked ? null : "0" })}
        >
          只看初始状态
        </CheckLabel>
        <span className="muted">
          普通与觉醒版分别保留；详情内切换强化版本。
        </span>
      </div>
      <details
        className="filter-box"
        open={params.get("filters") === "1"}
        onToggle={(event) => {
          const value = event.currentTarget.open ? "1" : null;
          if (value !== params.get("filters")) update({ filters: value });
        }}
      >
        <summary>
          <SlidersHorizontal />
          分类与条件
          {selected.length > 0 && <small>已选 {selected.length} 类</small>}
          <ChevronDown className="summary-arrow" />
        </summary>
        <div className="filter-columns">
          <section>
            <div className="section-heading">
              <h2>道具分类</h2>
              <button
                className="text-button"
                disabled={!selected.length}
                onClick={() => filter({ cats: null })}
              >
                清空分类
              </button>
            </div>
            <Tree
              nodes={categoryTree(items)}
              selected={selected}
              expanded={expanded}
              select={(key) =>
                filter({ cats: toggle(key, selected).join(",") })
              }
              expand={(key) =>
                update({ tree: toggle(key, expanded).join(",") })
              }
            />
          </section>
          <section className="conditions">
            <label className="select-label">
              职业条件
              <select
                aria-label="职业条件"
                value={params.get("job") || ""}
                onChange={(event) => filter({ job: event.target.value })}
              >
                <option value="">不限</option>
                {[...new Set(items.flatMap((item) => item.jobs || []))].map(
                  (job) => (
                    <option key={job}>{job}</option>
                  ),
                )}
              </select>
            </label>
            <p className="muted">
              按明确职业成员匹配，不表示完整的可装备资格。
            </p>
            {levelFields.map(([key, , label]) => (
              <fieldset className="level-range" key={key}>
                <legend>{label}</legend>
                <input
                  inputMode={key === "lii" ? "decimal" : "numeric"}
                  aria-label={`${label}最低`}
                  aria-invalid={!!invalid}
                  aria-describedby={invalid ? "range-error" : undefined}
                  placeholder="最低"
                  value={params.get(`${key}min`) || ""}
                  onChange={(event) =>
                    filter({ [`${key}min`]: event.target.value })
                  }
                />
                <span>至</span>
                <input
                  inputMode={key === "lii" ? "decimal" : "numeric"}
                  aria-label={`${label}最高`}
                  aria-invalid={!!invalid}
                  aria-describedby={invalid ? "range-error" : undefined}
                  placeholder="最高"
                  value={params.get(`${key}max`) || ""}
                  onChange={(event) =>
                    filter({ [`${key}max`]: event.target.value })
                  }
                />
              </fieldset>
            ))}
            {invalid && (
              <p className="validation" id="range-error" role="alert">
                {invalid}
              </p>
            )}
            <div className="flag-filters">
              {Object.entries(flagLabels).map(([key, label]) => (
                <label className="select-label" key={key}>
                  {label}
                  <select
                    aria-label={`${label}筛选`}
                    value={params.get(key) || ""}
                    onChange={(event) => filter({ [key]: event.target.value })}
                  >
                    <option value="">不限</option>
                    <option value="1">可以</option>
                    <option value="0">不可以</option>
                  </select>
                </label>
              ))}
            </div>
            <button
              className="button"
              onClick={() =>
                filter(
                  Object.fromEntries(
                    [
                      "job",
                      ...levelFields.flatMap(([key]) => [
                        `${key}min`,
                        `${key}max`,
                      ]),
                      ...Object.keys(flagLabels),
                    ].map((key) => [key, null]),
                  ),
                )
              }
            >
              清空使用条件
            </button>
          </section>
        </div>
      </details>
    </section>
  );
}
