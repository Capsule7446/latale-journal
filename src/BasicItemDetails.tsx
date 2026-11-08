import { ArrowLeft, PackageOpen } from "lucide-react";
import type { Item } from "./item-data";
import { categoryLabel, categoryStates } from "./item-data";

// The richer ItemDetails/route grouping stays isolated until a verified relation contract exists.
export function BasicItemDetails({
  item,
  back,
}: {
  item: Item;
  back: () => void;
}) {
  const root = item.category.segments[0].key;
  const active =
    root === "equipment" || root === "pets"
      ? "属性"
      : root === "consumables"
        ? "使用效果"
        : "道具说明";
  const unavailable =
    root === "equipment"
      ? ["获取方式", "用途"]
      : root === "consumables"
        ? ["获取方式"]
        : root === "pets"
          ? ["获取方式", "配合的阵容"]
          : root === "quests"
            ? ["关联任务", "材料用途", "获取方式"]
            : ["材料用途", "获取方式"];
  return (
    <div className="detail-inner">
      <button className="button back-button" onClick={back}>
        <ArrowLeft />
        {history.state?.journal?.fromItem ? "返回上一页" : "返回列表"}
      </button>
      <header className="detail-heading">
        <span
          className="item-icon"
          role="img"
          aria-label="图标资料未接入"
          title="图标资料未接入"
        >
          <PackageOpen />
        </span>
        <div>
          <span className="eyebrow">道具 #{item.id}</span>
          <h2 id="detail-title" tabIndex={-1}>
            {item.name}
          </h2>
          <p
            className="category-path"
            data-category-status={item.category.status}
          >
            {categoryLabel(item)}
          </p>
        </div>
      </header>
      <div className="detail-tabs" aria-label="道具详情栏目">
        <span className="active-detail-tab">{active}</span>
        {unavailable.map((label) => (
          <button key={label} disabled title="资料未接入">
            {label}（未接入）
          </button>
        ))}
      </div>
      <div className="detail-body">
        <section className="item-notes">
          <h3>道具原说明</h3>
          {item.description.status === "success" ? (
            <p className="original-text" data-description-status="success">
              {item.description.value}
            </p>
          ) : (
            <p className="muted" data-description-status="missing">
              说明缺失
            </p>
          )}
        </section>
        <section>
          <h3>分类状态</h3>
          <p>{categoryStates[item.category.status]}</p>
          {item.category.continuation === "unresolved" && (
            <p className="muted">后续分类尚未辨识。</p>
          )}
        </section>
        <section className="unconnected-fields">
          <h3>其他资料</h3>
          <p className="muted">
            图标、初始形态、等级、属性、Buff、套装、获取方式和用途资料未接入。
          </p>
        </section>
      </div>
    </div>
  );
}
