import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Monitor,
  Moon,
  Rainbow,
  Settings2,
  Sun,
  X,
} from "lucide-react";
import { Empty, Loading, Pager, Retry } from "./components";
import { Filters } from "./Filters";
import { BasicItemDetails } from "./BasicItemDetails";
import { categoryLabel } from "./item-data";
import type { Item } from "./item-data";
import { filterItems, pageState } from "./catalog";
import { useNavigation } from "./navigation";
import { useItems } from "./use-items";

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

const NO_ITEMS: Item[] = [];
export function App() {
  const { params, update, back } = useNavigation();
  const data = useItems();
  const items = data.release?.items ?? NO_ITEMS;
  const requestedId = params.get("item");
  const byId = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const selected = requestedId ? byId.get(requestedId) : undefined;
  const search = useDeferredValue(params.toString());
  const filtered = useMemo(
    () => filterItems(items, new URLSearchParams(search)),
    [items, search],
  );
  const page = pageState(params, filtered.length);
  const coverage = data.release?.manifest.coverage;
  const coverageText = coverage
    ? coverage.kind === "producer-test-subset"
      ? `真实测试子集：${coverage.count.toLocaleString("zh-CN")} / ${coverage.fullPublicCount.toLocaleString("zh-CN")} 条公开道具，仅搜索此测试范围。`
      : `已接入 ${coverage.count.toLocaleString("zh-CN")} 条基础道具。`
    : "资料未接入";
  const statusText =
    data.status === "unconnected"
      ? "资料未接入"
      : data.status === "loading"
        ? data.release
          ? "正在检查资料更新…"
          : "正在读取资料…"
        : data.status === "error"
          ? data.release
            ? "更新失败，继续显示已验证资料。"
            : "资料加载失败"
          : coverageText;
  useEffect(() => {
    if (selected)
      document.getElementById("detail-title")?.focus({ preventScroll: true });
  }, [selected?.id]);
  const selectItem = (id: string) => {
    update({ item: id, tab: null, "open-routes": null }, true);
    if (innerWidth < 1280) window.scrollTo(0, 0);
  };
  const unavailable =
    data.status === "loading" ? (
      <Loading />
    ) : data.status === "error" ? (
      <Empty title="资料加载失败" error action={<Retry onClick={data.retry} />}>
        {data.error}
      </Empty>
    ) : (
      <Empty title="资料未接入" />
    );
  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到道具内容
      </a>
      <div className="preview-toolbar">
        <span>页面预览</span>
        <span>
          {coverage?.kind === "producer-test-subset"
            ? "真实测试子集"
            : data.release
              ? "真实基础资料"
              : "资料未接入"}
        </span>
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
              客户端资料
              <span>{data.release ? "基础资料已接入" : "资料未接入"}</span>
            </div>
          </aside>
          <main
            id="main-content"
            data-data-version={data.release?.manifest.dataVersion}
            className={`site-content${data.release && requestedId ? " has-detail" : ""}`}
          >
            <div className="data-notice">
              <div className="data-feedback">
                <p id="data-status" role="status">
                  {statusText}
                </p>
                {data.release && data.status !== "ready" && (
                  <p className="data-coverage">{coverageText}</p>
                )}
                {data.release && data.error && <p role="alert">{data.error}</p>}
              </div>
              {data.status !== "unconnected" && (
                <button
                  className="button"
                  disabled={data.status === "loading"}
                  onClick={data.retry}
                >
                  {data.status === "error" ? "重试" : "检查资料更新"}
                </button>
              )}
            </div>
            <fieldset disabled={!data.release} aria-describedby="data-status">
              <Filters
                items={items}
                params={data.release ? params : new URLSearchParams()}
                update={data.release ? update : () => {}}
              />
            </fieldset>
            <div className="workspace">
              <section className="results-panel" aria-label="道具搜索结果">
                <div className="results-heading">
                  <h2>
                    资料结果{" "}
                    <span>
                      {data.release
                        ? filtered.length.toLocaleString("zh-CN")
                        : "-"}
                    </span>
                  </h2>
                </div>
                {!data.release ? (
                  unavailable
                ) : (
                  <>
                    <div
                      className="item-results"
                      aria-busy={search !== params.toString()}
                    >
                      {filtered
                        .slice(page.start, page.start + page.size)
                        .map((item) => (
                          <button
                            key={item.id}
                            id={`item-link-${item.id}`}
                            data-item-id={item.id}
                            className={`item-result${selected?.id === item.id ? " selected" : ""}`}
                            aria-current={
                              selected?.id === item.id ? "true" : undefined
                            }
                            onClick={() => selectItem(item.id)}
                          >
                            <span className="result-copy">
                              <span className="game-name">{item.name}</span>
                              <small>
                                #{item.id} · {categoryLabel(item)}
                              </small>
                            </span>
                            <ChevronRight className="result-arrow" />
                          </button>
                        ))}
                      {!filtered.length && (
                        <Empty title="没有匹配的道具">
                          调整名称、编号或分类条件后重试。
                        </Empty>
                      )}
                    </div>
                    <Pager
                      total={filtered.length}
                      params={params}
                      update={update}
                    />
                  </>
                )}
              </section>
              <aside className="detail-panel" aria-label="道具详情">
                {selected ? (
                  <BasicItemDetails item={selected} back={back} />
                ) : (
                  <div className="detail-inner">
                    {!data.release ? (
                      <Empty title="资料未接入" />
                    ) : requestedId ? (
                      <Empty
                        title="此资料版本未收录该编号"
                        action={
                          <button className="button" onClick={back}>
                            返回列表
                          </button>
                        }
                      >
                        编号 #{requestedId}
                      </Empty>
                    ) : (
                      <Empty title="选择道具查看原说明" />
                    )}
                  </div>
                )}
              </aside>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
