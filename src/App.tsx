import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  FlaskConical,
  Monitor,
  Moon,
  Rainbow,
  Search,
  Settings2,
  Sun,
  X,
} from "lucide-react";
import { filterItems, pageState, rangeError } from "./catalog";
import { Empty, ItemIcon, ItemName, Loading, Pager, Retry } from "./components";
import type { DemoPackage } from "./demo-model";
import { Filters } from "./Filters";
import { ItemDetails } from "./ItemDetails";
import { useNavigation } from "./navigation";

type Theme = "system" | "light" | "dark";
type Density = "standard" | "compact";
function preference<T extends string>(
  key: string,
  allowed: T[],
  fallback: T,
): T {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value as T) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}
function Settings() {
  const [theme, setTheme] = useState<Theme>(() =>
    preference("journal-theme", ["system", "light", "dark"], "system"),
  );
  const [density, setDensity] = useState<Density>(() =>
    preference("journal-density", ["standard", "compact"], "standard"),
  );
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" || (theme === "system" && media.matches),
      );
    apply();
    media.addEventListener("change", apply);
    try {
      localStorage.setItem("journal-theme", theme);
    } catch {
      /* In-memory setting still works. */
    }
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    document.documentElement.classList.toggle("compact", density === "compact");
    try {
      localStorage.setItem("journal-density", density);
    } catch {
      /* Optional persistence. */
    }
  }, [density]);
  return (
    <>
      <button
        className="button settings-trigger"
        onClick={() => dialog.current?.showModal()}
        aria-label="显示设置"
        aria-haspopup="dialog"
      >
        <Settings2 />
        <span>显示设置</span>
      </button>
      <dialog
        ref={dialog}
        className="settings-dialog"
        aria-labelledby="settings-title"
        onClick={(event) => {
          if (event.target === dialog.current) {
            const box = dialog.current.getBoundingClientRect();
            if (
              event.clientX < box.left ||
              event.clientX > box.right ||
              event.clientY < box.top ||
              event.clientY > box.bottom
            )
              dialog.current.close();
          }
        }}
      >
        <header>
          <h2 id="settings-title">显示设置</h2>
          <button
            className="icon-button"
            aria-label="关闭显示设置"
            onClick={() => dialog.current?.close()}
          >
            <X />
          </button>
        </header>
        <fieldset>
          <legend>外观</legend>
          <div className="segmented" role="group" aria-label="外观">
            {(
              [
                ["light", "浅色", Sun],
                ["dark", "深色", Moon],
                ["system", "系统", Monitor],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                aria-pressed={theme === value}
                onClick={() => setTheme(value)}
              >
                <Icon />
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>显示密度</legend>
          <div className="segmented" role="group" aria-label="显示密度">
            {(
              [
                ["standard", "标准"],
                ["compact", "紧凑"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                aria-pressed={density === value}
                onClick={() => setDensity(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="muted">偏好保存在此浏览器，立即生效。</p>
        <button
          className="button primary"
          onClick={() => dialog.current?.close()}
        >
          完成
        </button>
      </dialog>
    </>
  );
}

export function App() {
  const { params, update, back } = useNavigation();
  const [data, setData] = useState<DemoPackage | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const content = useRef<HTMLElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    fetch("/demo/items.json", { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("演示资料读取失败。");
        const result: unknown = await response.json();
        if (
          !result ||
          typeof result !== "object" ||
          !("kind" in result) ||
          result.kind !== "visual-demo" ||
          !("items" in result) ||
          !Array.isArray(result.items)
        )
          throw new Error("演示资料格式不正确。");
        if (!abort.signal.aborted) setData(result as DemoPackage);
      })
      .catch((reason: unknown) => {
        if (!abort.signal.aborted)
          setError(
            reason instanceof Error ? reason.message : "演示资料读取失败。",
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [attempt]);
  const mode = params.get("state") || "ready";
  const items = data?.items || [];
  const invalid = rangeError(params);
  const results = mode === "empty" ? [] : filterItems(items, params);
  const pagination = pageState(params, results.length);
  const selectedId = params.get("item");
  const selected = selectedId
    ? items.find((item) => item.id === selectedId)
    : results[pagination.start];
  const failure = !!error || mode === "error";
  const busy = loading || mode === "loading";
  const open = (id: string) => {
    update(
      { item: id, tab: null, "sources-group": null, "uses-group": null },
      true,
    );
    requestAnimationFrame(() => {
      const title = document.getElementById("detail-title");
      if (content.current && content.current.clientWidth < 1024)
        window.scrollTo(0, 0);
      title?.focus({ preventScroll: true });
    });
  };
  const retry = () => {
    update({ state: null });
    setAttempt((value) => value + 1);
  };
  const targetIssue =
    mode === "missing" || mode === "uncached" || mode === "removed";
  const hasDetail = !!selectedId || targetIssue;
  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到道具内容
      </a>
      <div className="preview-toolbar">
        <span>
          <FlaskConical />
          样式预览 <strong>演示资料</strong>
        </span>
        <label>
          预览状态
          <select
            aria-label="预览状态"
            value={mode}
            onChange={(event) =>
              update({
                state:
                  event.target.value === "ready" ? null : event.target.value,
              })
            }
          >
            <option value="ready">正常</option>
            <option value="loading">加载中</option>
            <option value="error">读取失败</option>
            <option value="empty">空结果</option>
            <option value="missing">目标缺失</option>
            <option value="uncached">尚未缓存</option>
            <option value="removed">版本中移除</option>
          </select>
        </label>
      </div>
      <div className="app-frame">
        <header className="site-header">
          <a className="brand" href="/" aria-label="彩虹岛手札道具首页">
            <Rainbow />
            <strong>彩虹岛手札</strong>
            <span>资料库</span>
          </a>
          <Settings />
        </header>
        <div className="site-layout">
          <aside className="side-nav" aria-label="资料导航">
            <p className="side-caption">浏览资料</p>
            <a href="/" aria-current="page">
              <BookOpen />
              <span>道具图鉴</span>
            </a>
            <div className="side-foot">
              客户端资料<span>当前为样式演示</span>
            </div>
          </aside>
          <main
            id="main-content"
            className={`site-content ${hasDetail ? "has-detail" : ""}`}
            ref={content}
          >
            <p className="demo-notice">
              <FlaskConical />
              <span>
                {data?.notice ||
                  "演示资料：名称、数值、图标与关系均为样式样例，不代表游戏资料或全库查询。"}
              </span>
            </p>
            <Filters items={items} params={params} update={update} />
            <div className="workspace">
              <section className="results-panel" aria-label="道具搜索结果">
                <div className="results-heading">
                  <h2>
                    资料结果{" "}
                    <span>{busy ? "…" : failure ? "-" : results.length}</span>
                  </h2>
                  <small>仅演示资料</small>
                </div>
                {busy ? (
                  <Loading />
                ) : failure ? (
                  <Empty
                    title="读取失败"
                    error
                    action={<Retry onClick={retry} />}
                  >
                    {error || "模拟读取失败；当前条件已保留。"}
                  </Empty>
                ) : invalid ? (
                  <Empty title="请修正等级条件" error>
                    {invalid}
                  </Empty>
                ) : results.length ? (
                  <>
                    <div className="item-results">
                      {results
                        .slice(
                          pagination.start,
                          pagination.start + pagination.size,
                        )
                        .map((item) => (
                          <button
                            className={`item-result ${selected?.id === item.id ? "selected" : ""}`}
                            key={item.id}
                            id={`item-${item.id}`}
                            onClick={() => open(item.id)}
                            aria-label={`查看 ${item.name}，编号 ${item.id}`}
                            aria-current={
                              selected?.id === item.id ? "true" : undefined
                            }
                          >
                            <ItemIcon item={item} />
                            <span className="result-copy">
                              <ItemName item={item} />
                              <small>
                                {item.path
                                  .map((node) => node.label)
                                  .join(" / ") || "分类尚未辨识"}
                              </small>
                              <small>
                                #{item.id}
                                {item.form && ` · ${item.form} · ${item.stage}`}
                              </small>
                            </span>
                            <ChevronRight className="result-arrow" />
                          </button>
                        ))}
                    </div>
                    <Pager
                      params={params}
                      update={update}
                      total={results.length}
                    />
                  </>
                ) : (
                  <Empty
                    title="没有符合条件的演示道具"
                    action={
                      <button
                        className="button"
                        onClick={() => {
                          update({
                            q: null,
                            cats: null,
                            state: null,
                            page: null,
                          });
                          document.getElementById("item-search")?.focus();
                        }}
                      >
                        <Search />
                        清空搜索与分类
                      </button>
                    }
                  >
                    试试“星光”或完整编号 91000001。
                  </Empty>
                )}
              </section>
              <aside className="detail-panel" aria-label="道具详情">
                {busy ? (
                  <Loading />
                ) : failure ? (
                  <Empty
                    title="资料暂不可用"
                    error
                    action={<Retry onClick={retry} />}
                  >
                    重试后保留原搜索与详情选择。
                  </Empty>
                ) : targetIssue || (selectedId && !selected) ? (
                  <div className="detail-inner">
                    <button
                      className="button"
                      onClick={() => {
                        update({ state: null });
                        back();
                      }}
                    >
                      返回列表
                    </button>
                    <Empty
                      title={
                        mode === "uncached"
                          ? "此资料尚未缓存"
                          : mode === "removed"
                            ? "此资料已从当前版本移除"
                            : "目标资料缺失"
                      }
                    >
                      {mode === "uncached"
                        ? "联网后才能读取。此处仅演示提示样式，尚未实现离线缓存。"
                        : "保留原编号，不跳转到同名道具。"}
                    </Empty>
                  </div>
                ) : selected ? (
                  <ItemDetails
                    item={selected}
                    items={items}
                    params={params}
                    update={update}
                    onOpen={open}
                    back={back}
                  />
                ) : (
                  <Empty title="选择一个道具查看详情">
                    先调整左侧搜索条件。
                  </Empty>
                )}
              </aside>
            </div>
            <footer className="data-footer">
              19 条样式样例 · 正式资料、离线缓存与其他板块尚未接入
            </footer>
          </main>
        </div>
      </div>
    </>
  );
}
