import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { configureRoot } from "./data-fixture";

test.beforeEach(async ({ page }) => configureRoot(page));

async function unconnected(page: Page) {
  await expect(page.locator("#data-status")).toHaveText("资料未接入");
  await expect(page.locator(".results-panel").getByRole("status")).toHaveText(
    "资料未接入",
  );
  await expect(page.locator(".results-heading")).toHaveText("资料结果 -");
  await expect(
    page.locator(".item-result,.route-toggle,#detail-title"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "搜索道具名称或精确编号" }),
  ).toBeDisabled();
  await expect(page.getByLabel("预览状态")).toHaveCount(0);
}

test("unconnected page ignores former demo URLs and never requests game data", async ({
  page,
}) => {
  const dataRequests: string[] = [],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      request.resourceType() === "fetch" ||
      request.resourceType() === "xhr" ||
      request.url().includes("/demo/")
    )
      dataRequests.push(request.url());
  });
  await page.route("**/demo/**", (route) => route.abort());
  for (const query of [
    "",
    "?item=91000005&tab=uses",
    "?state=ready",
    "?state=loading",
    "?state=error",
    "?state=empty",
    '?open-routes=["obsolete"]&item=1',
  ]) {
    await page.goto(`/${query}`);
    await unconnected(page);
    await expect(
      page.getByRole("textbox", { name: "搜索道具名称或精确编号" }),
    ).toHaveValue("");
  }
  expect(dataRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("retired JSON and icons return an explicit no-store gone response", async ({
  request,
}) => {
  for (const path of [
    "items.json",
    "equipment.svg",
    "consumable.svg",
    "material.svg",
    "pet.svg",
    "quest.svg",
  ]) {
    const response = await request.get(`/demo/${path}`);
    expect(response.status()).toBe(410);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(await response.text()).toBe("资料未接入");
  }
});

test("desktop and mobile preserve layout and working display settings without game content", async ({
  page,
}) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await unconnected(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 1440)
      await expect(page.locator(".detail-panel")).toBeVisible();
    else await expect(page.locator(".detail-panel")).toBeHidden();
    await page.screenshot({
      path: test.info().outputPath(`unconnected-${width}.png`),
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "显示设置" }).click();
  await page.getByRole("button", { name: "深色", exact: true }).click();
  await page.getByRole("button", { name: "紧凑", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "显示设置" })).toBeFocused();
  await expect(page.locator("html")).toHaveClass("dark compact");
  await page.reload();
  await unconnected(page);
  await expect(page.locator("html")).toHaveClass("dark compact");
});
