import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { DemoPackage } from "../../src/demo-model";

const twoExchangeSchemes = /^\[兑换\]阿洛.*2 个方案$/;
const upgradeLabel = /^\[升级\]\[星光练习剑\].*1 个方案$/;
const lifeLabel = /^\[吉恩蒂亚成品\]\[Lv1\]成品制造 > 拳套.*1 个方案$/;
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function shot(page: Page, name: string) {
  await page.screenshot({
    path: test.info().outputPath(`${name}.png`),
    fullPage: true,
  });
}

test("desktop routes collapse initially, show five labels and keep alternative schemes separate", async ({
  page,
}) => {
  const errors: string[] = [],
    api: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/(?:demo-api|\/api\/|:8811|:8812|:8787)/, (route) => {
    api.push(route.request().url());
    return route.abort();
  });
  await page.goto("/?item=91000005&tab=uses");
  await expect(page.locator(".route-toggle")).toHaveCount(5);
  await expect(page.locator(".route-scheme:visible")).toHaveCount(0);
  await expect(page.locator(".detail-panel .page-info")).toContainText(
    "1–5 / 6 项",
  );
  await expect(page.getByRole("button", { name: /^\[兑换\]阿洛/ })).toHaveCount(
    1,
  );
  await page.getByLabel("详情每页条数").selectOption("10");
  await expect(page.locator(".route-toggle")).toHaveCount(6);
  for (const name of [
    twoExchangeSchemes,
    lifeLabel,
    /^\[购买\]\[阿洛\]/,
    /^\[分解\]\[星光碎片\]/,
    upgradeLabel,
  ]) {
    await expect(page.getByRole("button", { name })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  }
  await expect(
    page.getByText("途径资料不全，此方案单独显示。", { exact: true }),
  ).toHaveCount(0);
  await shot(page, "routes-desktop-collapsed");
  const exchange = page.getByRole("button", { name: twoExchangeSchemes });
  await exchange.focus();
  await page.keyboard.press("Space");
  await expect(exchange).toHaveAttribute("aria-expanded", "true");
  const east = page.locator(".route-group").filter({ has: exchange });
  await expect(east.getByRole("article")).toHaveCount(2);
  const paper = east.getByRole("article", { name: "碎片与纸片兑换" });
  const engraved = east.getByRole("article", { name: "碎片与铭文兑换" });
  await expect(paper).toContainText("× 6");
  await expect(paper).toContainText("× 2");
  await expect(paper.getByText("费用：0 Ely", { exact: true })).toBeVisible();
  await expect(paper).toContainText("练习镇 > 东门");
  await expect(engraved).toContainText("× 10");
  await expect(engraved).toContainText("× 3");
  await expect(engraved.getByText("费用：-", { exact: true })).toBeVisible();
  await expect(
    engraved.getByRole("link", { name: "清晨恢复药水", exact: true }),
  ).toBeVisible();
  await expect(engraved).toContainText("练习镇 > 工坊");
  await shot(page, "routes-desktop-alternatives");
  const west = page
    .getByRole("button", { name: /^\[兑换\]米娜.*1 个方案$/ })
    .first();
  await west.click();
  await expect(
    page.getByRole("article", { name: "西门兑换方案" }),
  ).toContainText("练习镇 > 西门");
  await exchange.focus();
  await page.keyboard.press("Enter");
  await expect(exchange).toHaveAttribute("aria-expanded", "false");
  await expect(west).toHaveAttribute("aria-expanded", "true");
  await noOverflow(page);
  expect(errors).toEqual([]);
  expect(api).toEqual([]);
});

test("test-only same-name and missing-identity NPCs never merge on display", async ({
  page,
}) => {
  await page.route("**/demo/items.json", async (route) => {
    const response = await route.fetch();
    const fixture: DemoPackage = await response.json();
    const rows = fixture.items.find((item) => item.id === "91000005")!.uses!;
    const west = rows.find((row) => row.id === "demo-exchange-west")!;
    west.route = {
      kind: "exchange",
      npc: { id: "test-same-name-other-npc", name: "阿洛" },
    };
    for (const suffix of ["甲", "乙"])
      rows.push({
        ...rows[0],
        id: `test-missing-npc-${suffix}`,
        title: `身份未收录方案${suffix}`,
        route: { kind: "exchange", npc: { id: null, name: "阿洛" } },
      });
    await route.fulfill({ response, json: fixture });
  });
  await page.goto("/?item=91000005&tab=uses&uses-group=兑换");
  await expect(page.getByRole("button", { name: /^\[兑换\]阿洛/ })).toHaveCount(
    4,
  );
  await expect(
    page.getByRole("button", { name: twoExchangeSchemes }),
  ).toHaveCount(1);
  await expect(
    page.getByText("途径资料不全，此方案单独显示。", { exact: true }),
  ).toHaveCount(2);
  for (const toggle of await page.locator(".route-toggle").all())
    await toggle.click();
  for (const name of [
    "碎片与纸片兑换",
    "碎片与铭文兑换",
    "西门兑换方案",
    "身份未收录方案甲",
    "身份未收录方案乙",
  ]) {
    await expect(
      page.getByRole("article", { name, exact: true }),
    ).toBeVisible();
  }
  await expect(page.locator(".detail-panel .page-info")).toContainText(
    "1–4 / 4 项",
  );
});

test("320px route pagination and material navigation restore expansion, scroll and exact focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/?item=91000005&tab=uses");
  await expect(page.locator(".route-toggle")).toHaveCount(5);
  await noOverflow(page);
  await shot(page, "routes-320-collapsed");
  await page.getByRole("button", { name: twoExchangeSchemes }).click();
  await noOverflow(page);
  await shot(page, "routes-320-alternatives");
  const target = page
    .getByRole("article", { name: "碎片与铭文兑换" })
    .getByRole("link", { name: "古老星图中的第七块铭文碎片", exact: true });
  await target.scrollIntoViewIfNeeded();
  await target.focus();
  const position = await page.evaluate(() => scrollY);
  await target.click();
  await expect(page.locator("#detail-title")).toHaveText(
    "古老星图中的第七块铭文碎片",
  );
  await page.getByRole("button", { name: "返回上一页", exact: true }).click();
  await expect(
    page.getByRole("button", { name: twoExchangeSchemes }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(target).toBeFocused();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(position);
  await page.getByRole("button", { name: "详情下一页", exact: true }).click();
  const upgrade = page.getByRole("button", { name: upgradeLabel });
  await expect(upgrade).toHaveAttribute("aria-expanded", "false");
  await upgrade.click();
  const product = page.getByRole("link", {
    name: "星光练习剑 +1",
    exact: true,
  });
  await product.click();
  await expect(page.locator("#detail-title")).toHaveText("星光练习剑 +1");
  await page.goBack();
  await expect(
    page.getByRole("navigation", { name: "详情分页" }),
  ).toContainText("第 2 / 2 页");
  await expect(upgrade).toHaveAttribute("aria-expanded", "true");
  await expect(product).toBeFocused();
  await page.reload();
  await expect(upgrade).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("navigation", { name: "详情分页" }),
  ).toContainText("第 2 / 2 页");
  await page.getByRole("button", { name: "详情上一页", exact: true }).click();
  await expect(
    page.getByRole("button", { name: twoExchangeSchemes }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.emulateMedia({ colorScheme: "dark" });
  await noOverflow(page);
  await shot(page, "routes-320-dark");
  const smallTargets = await page
    .locator(".route-toggle")
    .evaluateAll(
      (elements) =>
        elements.filter(
          (element) => element.getBoundingClientRect().height < 44,
        ).length,
    );
  expect(smallTargets).toBe(0);
});

test("acquisition and usage keep separate route states and each retains multiple schemes", async ({
  page,
}) => {
  await page.goto("/?item=91000005&tab=uses&uses-group=兑换");
  const exchange = page.getByRole("button", { name: twoExchangeSchemes });
  await expect(exchange).toHaveAttribute("aria-expanded", "false");
  await exchange.click();
  await page.getByRole("tab", { name: "获取方式", exact: true }).click();
  await expect(exchange).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".route-scheme:visible")).toHaveCount(0);
  await exchange.click();
  await expect(
    page.getByRole("article", { name: "纸片兑换碎片" }),
  ).toContainText("× 6");
  await expect(
    page.getByRole("article", { name: "铭文兑换碎片" }),
  ).toContainText("× 12");
  await shot(page, "routes-acquisition-alternatives");
  await exchange.click();
  await page.getByRole("tab", { name: "材料用途", exact: true }).click();
  await expect(exchange).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("tab", { name: "制作", exact: true }).click();
  await expect(page.getByRole("button", { name: lifeLabel })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.getByRole("tab", { name: "兑换", exact: true }).click();
  await expect(exchange).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".item-result")).toHaveCount(10);
});
