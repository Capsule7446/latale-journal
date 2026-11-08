import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import type { Connect, Plugin } from "vite";
import react from "@vitejs/plugin-react";

const retiredDemo: Connect.NextHandleFunction = (request, response, next) => {
  if (
    new URL(request.url || "/", "http://localhost").pathname.startsWith(
      "/demo/",
    )
  ) {
    response.statusCode = 410;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.end("资料未接入");
    return;
  }
  next();
};
const rejectRetiredDemo: Plugin = {
  name: "reject-retired-demo",
  configureServer(server) {
    server.middlewares.use(retiredDemo);
  },
  configurePreviewServer(server) {
    server.middlewares.use(retiredDemo);
  },
};

function staticData(directory: string, root: string): Plugin {
  const prefix = new URL(
    root || "/data/items-v1/",
    "http://localhost",
  ).pathname.replace(/\/?$/, "/");
  const serve: Connect.NextHandleFunction = (request, response, next) => {
    const pathname = new URL(request.url || "/", "http://localhost").pathname;
    if (!pathname.startsWith(prefix)) return next();
    const relative = pathname.slice(prefix.length);
    if (
      !/^(?:current\.json|versions\/[a-f0-9]{64}\/(?:manifest|items)\.json)$/.test(
        relative,
      )
    )
      return next();
    if (!["GET", "HEAD"].includes(request.method || "")) {
      response.statusCode = 405;
      response.end();
      return;
    }
    const file = resolve(directory, ...relative.split("/"));
    void stat(file)
      .then((info) => {
        if (!info.isFile()) throw new Error("Not a static file");
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Content-Length", info.size);
        response.setHeader(
          "Cache-Control",
          relative === "current.json"
            ? "no-cache"
            : "public, max-age=31536000, immutable",
        );
        if (request.method === "HEAD") {
          response.end();
          return;
        }
        const stream = createReadStream(file);
        stream.on("error", () => response.destroy());
        response.on("close", () => stream.destroy());
        stream.pipe(response);
      })
      .catch(() => {
        response.statusCode = 404;
        response.end("Static data unavailable");
      });
  };
  return {
    name: "local-static-items",
    configureServer(server) {
      server.middlewares.use(serve);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), [
    "VITE_ITEMS_DATA_ROOT",
    "ITEMS_STATIC_DIRECTORY",
  ]);
  const root = env.VITE_ITEMS_DATA_ROOT || "";
  return {
    plugins: [
      rejectRetiredDemo,
      react(),
      {
        name: "items-root-configuration",
        transformIndexHtml() {
          return [
            {
              tag: "meta",
              attrs: { name: "items-data-root", content: root },
              injectTo: "head",
            },
          ];
        },
      },
      ...(env.ITEMS_STATIC_DIRECTORY
        ? [staticData(env.ITEMS_STATIC_DIRECTORY, root)]
        : []),
    ],
  };
});
