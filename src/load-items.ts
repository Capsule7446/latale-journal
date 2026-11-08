import {
  assertDocument,
  releaseIdentity,
} from "../contracts/items-v1/validate.mjs";
import type {
  Contract,
  File,
  Item,
  Items,
  Manifest,
  Pointer,
} from "../contracts/items-v1/types.d.ts";

export const DEFAULT_ITEMS_ROOT = "/data/items-v1/";
export type ItemsRelease = { manifest: Manifest; items: Item[] };
export type LoadErrorCode =
  | "configuration"
  | "request"
  | "document"
  | "integrity"
  | "contract"
  | "version"
  | "coverage";

export class ItemsLoadError extends Error {
  readonly code: LoadErrorCode;
  constructor(code: LoadErrorCode, message: string) {
    super(message);
    this.name = "ItemsLoadError";
    this.code = code;
  }
}

const fail = (code: LoadErrorCode, message: string): never => {
  throw new ItemsLoadError(code, message);
};
const hash = async (bytes: Uint8Array<ArrayBuffer>) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

function documentJson(bytes: Uint8Array<ArrayBuffer>): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return fail("document", "资料不是有效的 UTF-8 JSON，未展示该资料包。");
  }
}

export async function loadItemsRelease({
  root,
  contract,
  signal,
  fetcher = fetch,
}: {
  root: string;
  contract: Contract;
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}): Promise<ItemsRelease> {
  let base: URL;
  try {
    base = new URL(
      root.endsWith("/") ? root : `${root}/`,
      globalThis.location?.href,
    );
    if (
      !["http:", "https:"].includes(base.protocol) ||
      base.search ||
      base.hash ||
      base.username ||
      base.password
    )
      throw new Error("Invalid data root");
  } catch {
    return fail("configuration", "资料地址配置无效，资料未接入。");
  }

  async function read(url: URL, label: string, expected?: File) {
    let response: Response;
    try {
      response = await fetcher(url, {
        signal,
        credentials: "omit",
        redirect: "error",
        cache: "no-cache",
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      return fail("request", `${label}请求失败，请检查网络后重试。`);
    }
    if (!response.ok)
      return fail(
        "request",
        `${label}请求失败（HTTP ${response.status}），请重试。`,
      );
    const limit = expected?.bytes ?? 16384;
    const chunks: Uint8Array[] = [];
    let length = 0;
    const reader = response.body?.getReader();
    try {
      if (!reader) return fail("request", `${label}响应为空，请重试。`);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > limit) {
          await reader.cancel();
          return fail("integrity", `${label}字节长度不符，未展示该资料包。`);
        }
        chunks.push(value);
      }
    } catch (error) {
      if (signal?.aborted || error instanceof ItemsLoadError) throw error;
      return fail("request", `${label}读取中断，请重试。`);
    } finally {
      reader?.releaseLock();
    }
    if (expected && length !== expected.bytes)
      return fail("integrity", `${label}字节长度不符，未展示该资料包。`);
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    if (expected && (await hash(bytes)) !== expected.sha256)
      return fail("integrity", `${label}内容校验失败，未展示该资料包。`);
    signal?.throwIfAborted();
    return bytes;
  }

  function validate(kind: "pointer", bytes: Uint8Array<ArrayBuffer>): Pointer;
  function validate(kind: "manifest", bytes: Uint8Array<ArrayBuffer>): Manifest;
  function validate(kind: "items", bytes: Uint8Array<ArrayBuffer>): Items;
  function validate(
    kind: "pointer" | "manifest" | "items",
    bytes: Uint8Array<ArrayBuffer>,
  ) {
    try {
      // Overloads describe each document; the common validator owns all schema rules.
      if (kind === "pointer")
        return assertDocument("pointer", documentJson(bytes));
      if (kind === "manifest")
        return assertDocument("manifest", documentJson(bytes));
      return assertDocument("items", documentJson(bytes));
    } catch (error) {
      if (error instanceof ItemsLoadError) throw error;
      return fail("document", "资料不符合 items-v1 格式，未展示该资料包。");
    }
  }

  const current = validate(
    "pointer",
    await read(new URL("current.json", base), "资料入口"),
  );
  const manifestUrl = new URL(current.manifest.path, base);
  const manifest = validate(
    "manifest",
    await read(manifestUrl, "资料清单", current.manifest),
  );
  if (
    manifest.contract.sourceCommit !== contract.sourceCommit ||
    manifest.contract.sha256 !== contract.sha256
  )
    return fail("contract", "资料契约身份不受此应用信任，未展示该资料包。");
  if (
    manifest.dataVersion !== current.dataVersion ||
    (await hash(new TextEncoder().encode(releaseIdentity(manifest)))) !==
      current.dataVersion
  )
    return fail("version", "资料版本身份不一致，未展示该资料包。");
  const document = validate(
    "items",
    await read(
      new URL(manifest.items.path, manifestUrl),
      "道具资料",
      manifest.items,
    ),
  );
  const { items } = document;
  const coverage = manifest.coverage;
  if (
    items.length !== coverage.count ||
    (coverage.kind === "producer-test-subset" &&
      !items.every((item, index) => item.id === coverage.selection[index]))
  )
    return fail("coverage", "资料覆盖数量或测试范围不符，未展示该资料包。");
  signal?.throwIfAborted();
  return { manifest, items };
}
