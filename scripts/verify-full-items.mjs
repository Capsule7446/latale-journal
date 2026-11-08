import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { assertDocument } from "../contracts/items-v1/validate.mjs";

if (!process.argv[2])
  throw new Error(
    "Usage: node scripts/verify-full-items.mjs <full-producer-release-directory> [preview-url]",
  );
const directory = resolve(process.argv[2]);
const address = process.argv[3] || "http://127.0.0.1:4174/";
const pointer = assertDocument(
  "pointer",
  JSON.parse(readFileSync(resolve(directory, "current.json"), "utf8")),
);
const manifest = assertDocument(
  "manifest",
  JSON.parse(readFileSync(resolve(directory, pointer.manifest.path), "utf8")),
);
const document = assertDocument(
  "items",
  JSON.parse(
    readFileSync(
      resolve(directory, `versions/${pointer.dataVersion}/items.json`),
      "utf8",
    ),
  ),
);
if (manifest.coverage.kind !== "full-public")
  throw new Error(
    "Full-browser verification requires a full-public producer release",
  );
const anchor = document.items.find((item) => item.id === "84905009");
const missingCategory = document.items.find(
  (item) => item.category.status === "missing",
);
const missingDescription = document.items.find(
  (item) => item.description.status === "missing",
);
const output = resolve("test-results/full-release");
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [],
  apiCalls = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.route("**/*", async (route) => {
  const request = route.request();
  if (
    ["fetch", "xhr"].includes(request.resourceType()) &&
    !new URL(request.url()).pathname.startsWith("/data/items-v1/")
  ) {
    apiCalls.push(request.url());
    await route.abort();
    return;
  }
  await route.continue();
});
const began = performance.now();
try {
  await page.goto(address);
  await expect(page.locator("main")).toHaveAttribute(
    "data-data-version",
    pointer.dataVersion,
    { timeout: 60000 },
  );
  const loadMs = Math.round(performance.now() - began);
  await expect(page.locator(".results-heading")).toHaveText(
    `资料结果 ${manifest.coverage.count.toLocaleString("zh-CN")}`,
  );
  await expect(page.locator(".item-result")).toHaveCount(10);
  await page.screenshot({
    path: `${output}/full-1440-list.png`,
    fullPage: true,
  });
  const input = page.getByRole("textbox", { name: "搜索道具名称或精确编号" });
  const searchBegan = performance.now();
  await input.fill(anchor.id);
  await expect(page.locator(".item-result")).toHaveCount(1);
  const searchMs = Math.round(performance.now() - searchBegan);
  await page.locator(`[data-item-id="${anchor.id}"]`).click();
  await expect(page.locator("#detail-title")).toHaveText(anchor.name);
  expect(
    await page.locator('[data-description-status="success"]').textContent(),
  ).toBe(anchor.description.value);
  await page.screenshot({
    path: `${output}/full-1440-detail.png`,
    fullPage: true,
  });
  const nameQuery = anchor.name
    .trim()
    .normalize("NFKC")
    .toLocaleLowerCase("en");
  const expectedNameCount = document.items.filter((item) =>
    item.name
      .trim()
      .normalize("NFKC")
      .toLocaleLowerCase("en")
      .includes(nameQuery),
  ).length;
  await input.fill(anchor.name);
  await expect(page.locator(".results-heading")).toHaveText(
    `资料结果 ${expectedNameCount.toLocaleString("zh-CN")}`,
  );
  await input.fill("849050");
  await expect(page.locator(".results-heading")).toHaveText("资料结果 0");
  await input.fill(missingCategory.id);
  await page.locator(`[data-item-id="${missingCategory.id}"]`).click();
  await expect(page.locator(".category-path")).toHaveAttribute(
    "data-category-status",
    "missing",
  );
  await page.locator(".filter-box > summary").click();
  const roots = page
    .locator(".category-tree")
    .first()
    .locator(':scope > li > .category-node input[type="checkbox"]');
  for (let index = 0; index < (await roots.count()); index++)
    await roots.nth(index).check();
  await expect(page.locator(".results-heading")).toHaveText("资料结果 0");
  await page.getByRole("button", { name: "清空分类", exact: true }).click();
  await expect(page.locator(".results-heading")).toHaveText("资料结果 1");
  await input.fill(missingDescription.id);
  await page.locator(`[data-item-id="${missingDescription.id}"]`).click();
  await expect(page.locator('[data-description-status="missing"]')).toHaveText(
    "说明缺失",
  );
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(`${address}?q=${anchor.id}`);
  await expect(page.locator(`[data-item-id="${anchor.id}"]`)).toBeVisible({
    timeout: 60000,
  });
  await page.screenshot({
    path: `${output}/full-320-list.png`,
    fullPage: true,
  });
  await page.locator(`[data-item-id="${anchor.id}"]`).click();
  await expect(page.locator("#detail-title")).toHaveText(anchor.name);
  expect(
    await page.locator('[data-description-status="success"]').textContent(),
  ).toBe(anchor.description.value);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${output}/full-320-detail.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "返回列表", exact: true }).click();
  await expect(page.locator(`[data-item-id="${anchor.id}"]`)).toBeFocused();
  const resources = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((entry) => entry.name.includes("/data/items-v1/"))
      .map((entry) => ({
        path: new URL(entry.name).pathname,
        durationMs: Math.round(entry.duration),
        decodedBytes: entry.decodedBodySize,
      })),
  );
  expect(errors).toEqual([]);
  expect(apiCalls).toEqual([]);
  const evidence = {
    timestamp: new Date().toISOString(),
    dataVersion: pointer.dataVersion,
    count: document.items.length,
    itemsSha256: manifest.items.sha256,
    itemsBytes: manifest.items.bytes,
    loadMs,
    exactSearchMs: searchMs,
    originalDescriptionMatches: true,
    missingCategoryExcluded: true,
    missingDescriptionPreserved: true,
    desktopAnd320: true,
    queryApiRequests: apiCalls.length,
    pageErrors: errors,
    resources,
  };
  writeFileSync(
    `${output}/evidence.json`,
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence));
} finally {
  await browser.close();
}
