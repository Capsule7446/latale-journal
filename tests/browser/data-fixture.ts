import type { Page } from "@playwright/test";
import { DATA_PREFIX } from "../fixture-package";
import type { Fixture } from "../fixture-package";

// Change only deployment configuration. Game responses remain the producer's exact bytes.
export async function configureRoot(page: Page, root = "") {
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") return route.fallback();
    const response = await route.fetch();
    const html = await response.text();
    const body = html.replace(
      /<meta\b[^>]*name="items-data-root"[^>]*>/,
      `<meta name="items-data-root" content="${root}">`,
    );
    if (body === html && !html.includes(`content="${root}"`))
      throw new Error("Missing data-root configuration in built HTML");
    await route.fulfill({ response, body });
  });
}

export async function mountFixture(page: Page, fixture: Fixture) {
  await configureRoot(page, DATA_PREFIX);
  const state = {
    files: fixture.files,
    failCurrent: false,
    requests: [] as string[],
    apiCalls: [] as string[],
  };
  await page.route(`**${DATA_PREFIX}**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    state.requests.push(path);
    if (state.failCurrent && path === `${DATA_PREFIX}current.json`) {
      await route.fulfill({ status: 503, body: "Unavailable" });
      return;
    }
    const bytes = state.files.get(path);
    await route.fulfill(
      bytes
        ? {
            status: 200,
            contentType: "application/json; charset=utf-8",
            body: bytes,
          }
        : { status: 404, body: "Missing static file" },
    );
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (
      ["fetch", "xhr"].includes(request.resourceType()) &&
      !new URL(request.url()).pathname.startsWith(DATA_PREFIX)
    ) {
      state.apiCalls.push(request.url());
      await route.abort();
      return;
    }
    await route.fallback();
  });
  return state;
}
