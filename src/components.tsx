import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Copy,
  PackageOpen,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { pageState } from "./catalog";
import type { ItemView, Stat } from "./display-model";
import { flagLabels } from "./display-model";
import type { Update } from "./navigation";

export function ItemIcon({ item }: { item: ItemView }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [item.icon]);
  return (
    <span className="item-icon" aria-hidden="true">
      {item.icon && !failed ? (
        <img
          src={item.icon}
          alt=""
          width="40"
          height="40"
          onError={() => setFailed(true)}
        />
      ) : (
        <Sparkles />
      )}
    </span>
  );
}
export function ItemName({ item }: { item: ItemView }) {
  return (
    <span
      className="game-name"
      style={item.color ? { color: item.color } : undefined}
    >
      {item.name}
    </span>
  );
}
export function CheckLabel({
  checked,
  onChange,
  children,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="check-label" title={disabled ? "资料未接入" : undefined}>
      <input
        type="checkbox"
        disabled={disabled}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}
export function Tabs({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: [string, string][];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const group = useId();
  return (
    <div className="detail-tabs" role="tablist" aria-label={label}>
      {tabs.map(([key, text], index) => (
        <button
          key={key}
          id={`${group}-${key}`}
          role="tab"
          type="button"
          aria-selected={value === key}
          tabIndex={value === key ? 0 : -1}
          onClick={() => onChange(key)}
          onKeyDown={(event) => {
            let next = index;
            if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
            else if (event.key === "ArrowLeft")
              next = (index - 1 + tabs.length) % tabs.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = tabs.length - 1;
            else return;
            event.preventDefault();
            onChange(tabs[next][0]);
            document.getElementById(`${group}-${tabs[next][0]}`)?.focus();
          }}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
export function Stats({ rows }: { rows: Stat[] }) {
  return rows.length ? (
    <dl className="stat-list">
      {rows.map((row, i) => (
        <div key={i}>
          <dt>{row.label}</dt>
          <dd>
            {row.value === null ? (
              <span className="muted" title="该值尚未收录">
                -
              </span>
            ) : (
              <>
                {row.value}
                {row.unit && <span className="unit"> {row.unit}</span>}
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  ) : (
    <p className="muted">暂未收录数值属性。</p>
  );
}
export function Permissions({ item }: { item: ItemView }) {
  return (
    <ul className="permissions" aria-label="道具特性">
      {Object.entries(flagLabels).map(([key, label]) => {
        const value = item.flags[key as keyof typeof item.flags];
        return (
          <li key={key} data-allowed={String(value)}>
            {value === true ? (
              <Check />
            ) : value === false ? (
              <X />
            ) : (
              <span aria-hidden="true">-</span>
            )}
            {label}
            {value === true ? "可以" : value === false ? "不可以" : "未知"}
          </li>
        );
      })}
    </ul>
  );
}
export function Empty({
  title,
  children,
  action,
  error = false,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  error?: boolean;
}) {
  const Icon = error ? CircleAlert : PackageOpen;
  return (
    <div className="empty-state" role={error ? "alert" : "status"}>
      <Icon />
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading-state" role="status" aria-label="正在读取资料">
      <p>正在读取资料…</p>
      {[1, 2, 3, 4].map((i) => (
        <div className="skeleton-row" key={i}>
          <span />
          <div>
            <i />
            <i />
          </div>
        </div>
      ))}
    </div>
  );
}
export function Retry({ onClick }: { onClick: () => void }) {
  return (
    <button className="button" onClick={onClick}>
      <RotateCcw />
      重试
    </button>
  );
}

export function Pager({
  params,
  total,
  update,
  prefix = "",
  sizes = [10, 20, 40],
  label = "道具",
}: {
  params: URLSearchParams;
  total: number;
  update: Update;
  prefix?: string;
  sizes?: number[];
  label?: string;
}) {
  const { page, size, pages, start } = pageState(params, total, prefix, sizes);
  const [jump, setJump] = useState("");
  const [error, setError] = useState("");
  const errorId = useId();
  const change = (next: number, count = size) => {
    setError("");
    update({
      [`${prefix}page`]: String(next),
      [`${prefix}size`]: String(count),
    });
  };
  return (
    <footer className="pager">
      <div className="page-info">
        <span>
          {total ? `${start + 1}–${Math.min(start + size, total)}` : "0"} /{" "}
          {total} 项
        </span>
        <select
          aria-label={`${label}每页条数`}
          value={size}
          onChange={(e) =>
            change(
              Math.floor(start / Number(e.target.value)) + 1,
              Number(e.target.value),
            )
          }
        >
          {sizes.map((count) => (
            <option key={count} value={count}>
              {count} 条 / 页
            </option>
          ))}
        </select>
      </div>
      <nav aria-label={`${label}分页`}>
        <button
          className="icon-button"
          aria-label={`${label}上一页`}
          disabled={page <= 1}
          onClick={() => change(page - 1)}
        >
          <ArrowLeft />
        </button>
        <span>
          第 {page} / {pages} 页
        </span>
        <button
          className="icon-button"
          aria-label={`${label}下一页`}
          disabled={page >= pages}
          onClick={() => change(page + 1)}
        >
          <ArrowRight />
        </button>
      </nav>
      {pages > 1 && (
        <form
          className="page-jump"
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^[1-9]\d*$/.test(jump) || Number(jump) > pages)
              setError(`请输入 1–${pages} 的整数。`);
            else change(Number(jump));
          }}
        >
          <label>
            跳至
            <input
              aria-label={`${label}跳转页码`}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              inputMode="numeric"
              value={jump}
              onChange={(e) => setJump(e.target.value)}
            />
          </label>
          <button className="button" type="submit">
            前往
          </button>
          {error && (
            <p className="validation" id={errorId} role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </footer>
  );
}
export function Paged({
  rows,
  params,
  update,
  prefix,
  sizes,
  children,
}: {
  rows: ReactNode[];
  params: URLSearchParams;
  update: Update;
  prefix: string;
  sizes?: number[];
  children?: ReactNode;
}) {
  const counts = sizes || [5, 10, 20];
  const { start, size } = pageState(params, rows.length, prefix, counts);
  return (
    <>
      {children}
      {rows.slice(start, start + size)}
      {rows.length > 0 && (
        <Pager
          params={params}
          total={rows.length}
          update={update}
          prefix={prefix}
          sizes={counts}
          label="详情"
        />
      )}
    </>
  );
}
export function CopyNames({
  names,
  label = "复制全部名称",
}: {
  names: string[];
  label?: string;
}) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <span className="copy-control">
      <button
        className="button"
        disabled={!names.length}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(names.join("\n"));
            setMessage("已复制名称");
          } catch {
            setMessage("复制失败，请选中文字复制。");
          }
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setMessage(""), 3500);
        }}
      >
        <Copy />
        {label}
      </button>
      <span className="muted" role="status">
        {message}
      </span>
    </span>
  );
}
