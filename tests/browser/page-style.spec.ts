import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function loaded(page: Page, query = "") {
  await page.goto(`/${query}`);
  await expect(page.locator(".demo-notice")).toContainText("演示资料");
  await expect(page.locator(".item-result").first()).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: test.info().outputPath(`${name}.png`),
    fullPage: true,
  });
}

test("desktop static-only search, version changes, fixed tabs and settings", async ({
  page,
}) => {
  const errors: string[] = [];
  const businessRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/(?:demo-api|\/api\/|:8811|:8812|:8787)/, (route) => {
    businessRequests.push(route.request().url());
    return route.abort();
  });
  await loaded(page);
  await expect(page.locator(".detail-panel")).toBeVisible();
  await expect(
    page.getByRole("tablist", { name: "道具详情标签" }),
  ).toContainText("属性获取方式用途");
  await expect(
    page.getByRole("checkbox", { name: "只看初始状态" }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "道具说明", exact: true }),
  ).not.toBeChecked();
  await screenshot(page, "desktop-light");
  await page.getByRole("button", { name: "+1", exact: true }).click();
  await expect(page.locator("#detail-title")).toHaveText("星光练习剑 +1");
  await expect(
    page.getByRole("tabpanel", { name: "属性", exact: true }),
  ).toContainText("150");
  await page.getByRole("button", { name: "显示设置" }).click();
  await page.getByRole("button", { name: "深色", exact: true }).click();
  await page.getByRole("button", { name: "紧凑", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("html")).toHaveClass("dark compact");
  await expect(page.getByRole("button", { name: "显示设置" })).toBeFocused();
  await screenshot(page, "desktop-dark-compact");
  await page.reload();
  await expect(page.locator("html")).toHaveClass("dark compact");
  await page
    .getByRole("textbox", { name: "搜索道具名称或精确编号" })
    .fill("910000");
  await expect(page.getByText("没有符合条件的演示道具")).toBeVisible();
  await noOverflow(page);
  expect(errors).toEqual([]);
  expect(businessRequests).toEqual([]);
});

test("320px full paths, nested relations, browser back restores search and focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await loaded(page);
  await screenshot(page, "320-list");
  await page
    .getByRole("textbox", { name: "搜索道具名称或精确编号" })
    .fill("星光");
  await expect(page.locator(".item-result")).toHaveCount(4);
  await page.locator("#item-91000003").click();
  await expect(page.locator(".search-area")).toBeHidden();
  await expect(page.locator("#detail-title")).toBeFocused();
  await expect(page.getByText("武器觉醒词条", { exact: true })).toBeVisible();
  await noOverflow(page);
  await screenshot(page, "320-awakening");
  await page.getByRole("tab", { name: "获取方式", exact: true }).click();
  await page
    .getByRole("button", {
      name: "[练习成品][Lv1]成品制造 > 单手剑 1 个方案",
      exact: true,
    })
    .click();
  await page.getByRole("link", { name: "星光碎片", exact: true }).click();
  await expect(page.locator("#detail-title")).toHaveText("星光碎片");
  await page.getByRole("button", { name: "返回上一页", exact: true }).click();
  await expect(page.locator("#detail-title")).toHaveText("觉醒·星光练习剑");
  await expect(
    page.getByRole("tab", { name: "获取方式", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.goBack();
  await expect(page.locator(".search-area")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "搜索道具名称或精确编号" }),
  ).toHaveValue("星光");
  await expect(page.locator("#item-91000003")).toBeFocused();
  await page.goForward();
  await expect(page.locator("#detail-title")).toHaveText("觉醒·星光练习剑");
  await noOverflow(page);
});

test("390px all five category templates and deep category tree remain accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const cases = [
    ["91000009", ["属性", "套装", "获取方式", "用途"]],
    ["91000006", ["使用效果", "获取方式"]],
    ["91000018", ["道具说明", "材料用途", "获取方式"]],
    ["91000007", ["道具说明", "关联任务", "材料用途", "获取方式"]],
    ["91000008", ["属性", "获取方式", "配合的阵容"]],
  ] as const;
  for (const [id, tabs] of cases) {
    await page.goto(`/?item=${id}`);
    await expect(page.locator("#detail-title")).toBeVisible();
    await expect(
      page.getByRole("tablist", { name: "道具详情标签" }).getByRole("tab"),
    ).toHaveText([...tabs]);
    for (const tab of tabs) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await noOverflow(page);
    }
    await screenshot(page, `390-${id}`);
  }
  await loaded(
    page,
    "?filters=1&cats=engraved&tree=material,craft-material,special-material,ancient,starmap",
  );
  await expect(
    page.getByRole("checkbox", { name: "铭文碎片", exact: true }),
  ).toBeChecked();
  await expect(page.locator(".item-result")).toHaveCount(1);
  await noOverflow(page);
  await screenshot(page, "390-filters");
  const smallTargets = await page
    .locator("button:not(:disabled),select,summary,a,.check-label")
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.height < 43.9;
        })
        .map((element) => ({
          text: element.textContent,
          height: element.getBoundingClientRect().height,
        })),
    );
  expect(smallTargets).toEqual([]);
});

test("load/error/empty/missing states and real failed JSON retry preserve query", async ({
  page,
}) => {
  await loaded(page);
  for (const [mode, message] of [
    ["loading", "正在读取演示资料…"],
    ["error", "读取失败"],
    ["empty", "没有符合条件的演示道具"],
    ["missing", "目标资料缺失"],
    ["uncached", "此资料尚未缓存"],
    ["removed", "此资料已从当前版本移除"],
  ]) {
    await page.getByLabel("预览状态").selectOption(mode);
    await expect(
      page.locator("main").getByText(message, { exact: true }).first(),
    ).toBeVisible();
    await noOverflow(page);
    if (mode === "error" || mode === "loading" || mode === "empty")
      await screenshot(page, mode);
  }
  let fail = true;
  await page.route("**/demo/items.json", (route) =>
    fail ? route.abort() : route.continue(),
  );
  await page.goto("/?q=星光");
  await expect(
    page.locator("main").getByText("读取失败", { exact: true }),
  ).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "重试", exact: true }).first().click();
  await expect(page.locator(".item-result")).toHaveCount(4);
  await expect(
    page.getByRole("textbox", { name: "搜索道具名称或精确编号" }),
  ).toHaveValue("星光");
});

test("keyboard tabs, invalid range feedback, pagination and image fallback", async ({
  page,
}) => {
  await loaded(page, "?filters=1");
  await page
    .getByRole("textbox", { name: "普通等级最低", exact: true })
    .fill("2.5");
  await expect(page.locator("#range-error")).toContainText("整数");
  await expect(
    page.getByRole("textbox", { name: "普通等级最低", exact: true }),
  ).toHaveValue("2.5");
  await page.getByRole("button", { name: "清空使用条件" }).click();
  await page.getByRole("button", { name: "道具下一页" }).click();
  await expect(page.locator(".item-result").first()).toHaveAttribute(
    "id",
    "item-91000013",
  );
  await page.getByLabel("道具每页条数").selectOption("20");
  await expect(page.locator(".item-result")).toHaveCount(17);
  await page.getByRole("tab", { name: "属性", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "获取方式", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("tab", { name: "获取方式", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.route("**/demo/equipment.svg", (route) => route.abort());
  await page.reload();
  await expect(page.locator("#item-91000001 .game-name")).toBeVisible();
  await expect(page.locator("#item-91000001 .item-icon svg")).toBeVisible();
  await noOverflow(page);
});

test("320px dense content, IME composition, scroll restoration and system theme", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await loaded(page);
  const search = page.getByRole("textbox", { name: "搜索道具名称或精确编号" });
  await search.dispatchEvent("compositionstart");
  await search.fill("星光");
  await page.waitForTimeout(260); // Query must remain unchanged during composition, past the debounce.
  await expect(page.locator(".item-result")).toHaveCount(10);
  await search.dispatchEvent("compositionend", { data: "星光" });
  await expect(page.locator(".item-result")).toHaveCount(4);
  await page.locator("#item-91000005").scrollIntoViewIfNeeded();
  const listScroll = await page.evaluate(() => scrollY);
  await page.locator("#item-91000005").click();
  await page.getByRole("tab", { name: "材料用途", exact: true }).click();
  await page.getByRole("button", { name: "详情下一页", exact: true }).click();
  await page
    .getByRole("button", { name: "[升级][星光练习剑] 1 个方案", exact: true })
    .click();
  await page.getByRole("link", { name: "星光练习剑", exact: true }).click();
  await page.getByRole("button", { name: "返回上一页", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "材料用途", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("navigation", { name: "详情分页" }),
  ).toContainText("第 2 / 2 页");
  await page.getByRole("button", { name: "返回列表", exact: true }).click();
  await expect(page.locator("#item-91000005")).toBeFocused();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(listScroll);
  await loaded(
    page,
    "?filters=1&cats=engraved&tree=material,craft-material,special-material,ancient,starmap",
  );
  await noOverflow(page);
  await screenshot(page, "320-deep-filters");
  await page.goto("/?item=91000010");
  await expect(page.getByRole("table")).toBeVisible();
  await noOverflow(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass("dark");
  await screenshot(page, "320-gem-dark");
  await page.getByRole("button", { name: "显示设置" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await noOverflow(page);
  await screenshot(page, "320-settings-dark");
});
