import { expect, test } from "@playwright/test";
import { readFixture } from "../fixture-package";
import { mountFixture } from "./data-fixture";

const fixture = readFixture();
const items = fixture.document.items;
const anchor = items.find((item) => item.id === "84905009")!;

test("real basic fields load through static files, exact IDs stay exact, and unsupported URL filters do nothing", async ({
  page,
}) => {
  expect(anchor).toBeDefined();
  const transport = await mountFixture(page, fixture);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/?state=empty&initial=1&job=unsupported&lvmin=invalid&trade=0&buff=1&setname=1",
  );
  await expect(page.locator("#data-status")).toContainText(
    `真实测试子集：${items.length.toLocaleString("zh-CN")}`,
  );
  await expect(page.locator(".results-heading")).toHaveText(
    `资料结果 ${items.length.toLocaleString("zh-CN")}`,
  );
  await expect(
    page.getByRole("checkbox", { name: "只看初始状态" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("checkbox", { name: "只看初始状态" }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: /Buff名称与说明/ }),
  ).toBeDisabled();
  await expect(
    page.getByRole("checkbox", { name: /Buff名称与说明/ }),
  ).not.toBeChecked();
  await page
    .getByRole("textbox", { name: "搜索道具名称或精确编号" })
    .fill(anchor.id);
  await expect(page.locator(".item-result")).toHaveCount(1);
  await page.locator(`[data-item-id="${anchor.id}"]`).click();
  await expect(page.locator("#detail-title")).toHaveText(anchor.name);
  expect(
    await page.locator('[data-description-status="success"]').textContent(),
  ).toBe(anchor.description.value);
  await expect(
    page.getByRole("button", { name: "获取方式（未接入）" }),
  ).toBeDisabled();
  await expect(
    page.locator(".route-toggle,.permissions,.stat-list"),
  ).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "搜索道具名称或精确编号" })
    .fill("849050");
  await expect(page.locator(".results-heading")).toHaveText("资料结果 0");
  await expect(page.getByText("没有匹配的道具", { exact: true })).toBeVisible();
  expect(transport.apiCalls).toEqual([]);
  expect(errors).toEqual([]);
});

test("missing fields stay missing, all selected roots exclude missing category records", async ({
  page,
}) => {
  const missingCategory = items.find(
    (item) => item.category.status !== "success",
  )!;
  const missingDescription = items.find(
    (item) => item.description.status === "missing",
  )!;
  expect(missingCategory).toBeDefined();
  expect(missingDescription).toBeDefined();
  await mountFixture(page, fixture);
  await page.goto(`/?q=${missingCategory.id}&item=${missingCategory.id}`);
  await expect(page.locator("#detail-title")).toHaveText(missingCategory.name);
  await expect(page.locator(".category-path")).toHaveAttribute(
    "data-category-status",
    "missing",
  );
  await expect(page.locator(".results-heading")).toHaveText("资料结果 1");
  await page.goto(
    `/?q=${missingCategory.id}&cats=equipment,consumables,other,quests,pets&filters=1`,
  );
  await expect(page.locator(".results-heading")).toHaveText("资料结果 0");
  await page.getByRole("button", { name: "清空分类", exact: true }).click();
  await expect(page.locator(".results-heading")).toHaveText("资料结果 1");
  await expect(
    page.getByRole("textbox", { name: "搜索道具名称或精确编号" }),
  ).toHaveValue(missingCategory.id);
  await page.goto(`/?item=${missingDescription.id}`);
  await expect(page.locator("#detail-title")).toHaveText(
    missingDescription.name,
  );
  await expect(page.locator('[data-description-status="missing"]')).toHaveText(
    "说明缺失",
  );
  const absentId = String(
    Math.max(...items.map((item) => Number(item.id))) + 1,
  );
  await page.goto(`/?item=${absentId}`);
  await expect(
    page.getByText("此资料版本未收录该编号", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("#detail-title")).toHaveCount(0);
});

test("request failures can retry; invalid updates keep the last verified release", async ({
  page,
}) => {
  const transport = await mountFixture(page, fixture);
  transport.failCurrent = true;
  await page.goto("/");
  await expect(page.locator("#data-status")).toHaveText("资料加载失败");
  await expect(page.locator(".results-panel").getByRole("alert")).toContainText(
    "HTTP 503",
  );
  await expect(page.locator(".results-heading")).toHaveText("资料结果 -");
  transport.failCurrent = false;
  await page
    .locator(".results-panel")
    .getByRole("button", { name: "重试" })
    .click();
  await expect(page.locator("main")).toHaveAttribute(
    "data-data-version",
    fixture.current.dataVersion,
  );
  const damaged = new Map(fixture.files);
  damaged.set(
    `/data/items-v1/${fixture.current.manifest.path}`,
    Buffer.from(" "),
  );
  transport.files = damaged;
  await page.getByRole("button", { name: "检查资料更新" }).click();
  await expect(page.locator("#data-status")).toHaveText(
    "更新失败，继续显示已验证资料。",
  );
  await expect(page.locator("main")).toHaveAttribute(
    "data-data-version",
    fixture.current.dataVersion,
  );
  await expect(page.locator(".results-heading")).toHaveText(
    `资料结果 ${items.length.toLocaleString("zh-CN")}`,
  );
  transport.files = fixture.files;
  await page
    .locator(".data-notice")
    .getByRole("button", { name: "重试" })
    .click();
  await expect(page.locator("#data-status")).toContainText("真实测试子集");
});

test("desktop and 320px show producer text and preserve navigation and display settings", async ({
  page,
}) => {
  await mountFixture(page, fixture);
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/?q=${anchor.id}`);
    await expect(page.locator(".item-result")).toHaveCount(1);
    await page.screenshot({
      path: test.info().outputPath(`real-${width}-list.png`),
      fullPage: true,
    });
    await page.locator(`[data-item-id="${anchor.id}"]`).click();
    await expect(page.locator("#detail-title")).toHaveText(anchor.name);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 320)
      await expect(page.locator(".results-panel")).toBeHidden();
    await page.screenshot({
      path: test.info().outputPath(`real-${width}-detail.png`),
      fullPage: true,
    });
    if (width === 1440) {
      const another = items.find((item) => item.id !== anchor.id)!;
      await page
        .getByRole("textbox", { name: "搜索道具名称或精确编号" })
        .fill(another.id);
      await page.locator(`[data-item-id="${another.id}"]`).click();
      await expect(page.locator("#detail-title")).toHaveText(another.name);
      await page
        .getByRole("button", { name: "返回上一页", exact: true })
        .click();
      await expect(page.locator("#detail-title")).toHaveText(anchor.name);
    }
    await page.getByRole("button", { name: "返回列表", exact: true }).click();
    await expect(page.locator(`[data-item-id="${anchor.id}"]`)).toBeFocused();
    await expect(
      page.getByRole("textbox", { name: "搜索道具名称或精确编号" }),
    ).toHaveValue(anchor.id);
  }
  await page.getByRole("button", { name: "显示设置" }).click();
  await page.getByRole("button", { name: "深色", exact: true }).click();
  await page.getByRole("button", { name: "紧凑", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator("html")).toHaveClass("dark compact");
  await expect(page.locator(".item-result")).toHaveCount(1);
  await page.screenshot({
    path: test.info().outputPath("real-320-dark.png"),
    fullPage: true,
  });
});

test("IME composition completes before applying an actual producer name query", async ({
  page,
}) => {
  await mountFixture(page, fixture);
  await page.goto("/");
  await expect(page.locator(".results-heading")).toHaveText(
    `资料结果 ${items.length.toLocaleString("zh-CN")}`,
  );
  const input = page.getByRole("textbox", { name: "搜索道具名称或精确编号" });
  await input.dispatchEvent("compositionstart");
  await input.fill(anchor.name);
  await page.waitForTimeout(300);
  await expect(page.locator(".results-heading")).toHaveText(
    `资料结果 ${items.length.toLocaleString("zh-CN")}`,
  );
  await input.dispatchEvent("compositionend", { data: anchor.name });
  await expect
    .poll(() => new URL(page.url()).searchParams.get("q"))
    .toBe(anchor.name);
  await expect(page.locator(`[data-item-id="${anchor.id}"]`)).toBeVisible();
});

test("one unchanged application switches whole producer releases after successful verification", async ({
  page,
}) => {
  const second = readFixture("items-v1-b");
  const transport = await mountFixture(page, fixture);
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute(
    "data-data-version",
    fixture.current.dataVersion,
  );
  const scripts = await page
    .locator("script[src]")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("src")));
  transport.files = second.files;
  await page.getByRole("button", { name: "检查资料更新" }).click();
  await expect(page.locator("main")).toHaveAttribute(
    "data-data-version",
    second.current.dataVersion,
  );
  await expect(page.locator(".results-heading")).toHaveText(
    `资料结果 ${second.document.items.length.toLocaleString("zh-CN")}`,
  );
  await expect(page.locator("#data-status")).toContainText(
    `真实测试子集：${second.document.items.length} / ${second.manifest.coverage.fullPublicCount.toLocaleString("zh-CN")}`,
  );
  const added = second.document.items.find(
    (item) => !items.some((original) => original.id === item.id),
  )!;
  expect(added).toBeDefined();
  await page
    .getByRole("textbox", { name: "搜索道具名称或精确编号" })
    .fill(added.id);
  await page.locator(`[data-item-id="${added.id}"]`).click();
  await expect(page.locator("#detail-title")).toHaveText(added.name);
  expect(
    await page
      .locator("script[src]")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("src"))),
  ).toEqual(scripts);
  expect(transport.apiCalls).toEqual([]);
});
