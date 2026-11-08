import { useEffect, useState } from "react";
import { ITEMS_CONTRACT } from "./items-contract-lock";
import { ItemsLoadError, loadItemsRelease } from "./load-items";
import type { ItemsRelease } from "./load-items";

type LoadState = {
  status: "unconnected" | "loading" | "ready" | "error";
  release?: ItemsRelease;
  error?: string;
};

export function useItems() {
  const root = document
    .querySelector<HTMLMetaElement>('meta[name="items-data-root"]')
    ?.content.trim();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState>({
    status: root ? "loading" : "unconnected",
  });
  useEffect(() => {
    if (!root) return;
    const controller = new AbortController();
    setState((previous) => ({ status: "loading", release: previous.release }));
    loadItemsRelease({
      root,
      contract: ITEMS_CONTRACT,
      signal: controller.signal,
    }).then(
      (release) => {
        if (!controller.signal.aborted) setState({ status: "ready", release });
      },
      (error) => {
        if (!controller.signal.aborted)
          setState((previous) => ({
            status: "error",
            release: previous.release,
            error:
              error instanceof ItemsLoadError
                ? error.message
                : "资料读取失败，请重试。",
          }));
      },
    );
    return () => controller.abort();
  }, [root, attempt]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
