import {
  ChevronDown,
  ChevronRight,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CategoryNode } from "./display-model";
import type { Item } from "./item-data";
import { flagLabels, levelFields } from "./display-model";
import { categoryTree, values } from "./catalog";
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
  items: Item[];
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
  const tree = useMemo(() => categoryTree(items), [items]);
  return (
    <section className="search-area" aria-label="搜索与筛选">
      <div className="page-heading">
        <h1>道具图鉴</h1>
        <p>搜索名称、编号与原说明，浏览已辨识分类。</p>
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
            disabled={key !== "desc"}
            checked={key === "desc" && params.get(key) === "1"}
            onChange={(checked) => filter({ [key]: checked ? "1" : null })}
          >
            {label}
            {key !== "desc" && "（未接入）"}
          </CheckLabel>
        ))}
      </div>
      <div className="initial-filter">
        <CheckLabel disabled checked={false} onChange={() => {}}>
          只看初始状态
        </CheckLabel>
        <span className="muted">初始形态资料未接入，筛选已停用。</span>
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
              nodes={tree}
              selected={selected}
              expanded={expanded}
              select={(key) =>
                filter({ cats: toggle(key, selected).join(",") })
              }
              expand={(key) =>
                update({ tree: toggle(key, expanded).join(",") })
              }
            />
            <p className="muted category-help">
              分类筛选只包含已辨识路径；清空分类可查看分类缺失的道具。
            </p>
          </section>
          <fieldset
            className="conditions"
            disabled
            aria-describedby="unsupported-filters"
          >
            <p className="muted" id="unsupported-filters">
              职业、等级、属性和途径资料未接入，相关筛选已停用。
            </p>
            <label className="select-label">
              职业条件
              <select aria-label="职业条件" value="" onChange={() => {}}>
                <option value="">资料未接入</option>
              </select>
            </label>
            {levelFields.map(([key, , label]) => (
              <fieldset className="level-range" key={key}>
                <legend>{label}</legend>
                <input
                  inputMode={key === "lii" ? "decimal" : "numeric"}
                  aria-label={`${label}最低`}
                  placeholder="未接入"
                  value=""
                  readOnly
                />
                <span>至</span>
                <input
                  inputMode={key === "lii" ? "decimal" : "numeric"}
                  aria-label={`${label}最高`}
                  placeholder="未接入"
                  value=""
                  readOnly
                />
              </fieldset>
            ))}
            <div className="flag-filters">
              {Object.entries(flagLabels).map(([key, label]) => (
                <label className="select-label" key={key}>
                  {label}
                  <select
                    aria-label={`${label}筛选`}
                    value=""
                    onChange={() => {}}
                  >
                    <option value="">资料未接入</option>
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </details>
    </section>
  );
}
