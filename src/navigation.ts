import { useEffect, useRef, useState } from "react";

export type Patch = Record<string, string | null>;
export type Update = (patch: Patch, push?: boolean) => void;
type Position = { scroll: number; focus?: string; depth: number };

export function useNavigation() {
  const [search, setSearch] = useState(location.search);
  const restore = useRef<Position | null>(null);
  useEffect(() => {
    history.scrollRestoration = "manual";
    const onPop = () => {
      restore.current = history.state?.journal || { scroll: 0, depth: 0 };
      setSearch(location.search);
    };
    const save = () => {
      history.replaceState(
        {
          ...history.state,
          journal: {
            ...history.state?.journal,
            depth: history.state?.journal?.depth || 0,
            scroll: window.scrollY,
            focus: (document.activeElement as HTMLElement)?.id,
          },
        },
        "",
        location.href,
      );
    };
    addEventListener("popstate", onPop);
    addEventListener("scroll", save, { passive: true });
    addEventListener("focusin", save);
    return () => {
      removeEventListener("popstate", onPop);
      removeEventListener("scroll", save);
      removeEventListener("focusin", save);
    };
  }, []);
  useEffect(() => {
    if (!restore.current) return;
    const position = restore.current;
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, position.scroll);
      if (position.focus)
        document.getElementById(position.focus)?.focus({ preventScroll: true });
      restore.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [search]);
  const update: Update = (patch, push = false) => {
    const params = new URLSearchParams(location.search);
    const fromItem = params.get("item");
    for (const [key, value] of Object.entries(patch))
      value === null || value === ""
        ? params.delete(key)
        : params.set(key, value);
    const next = params.size ? `?${params}` : location.pathname;
    if (push) {
      const depth = history.state?.journal?.depth || 0;
      history.replaceState(
        {
          ...history.state,
          journal: {
            ...history.state?.journal,
            depth,
            scroll: window.scrollY,
            focus: (document.activeElement as HTMLElement)?.id,
          },
        },
        "",
        location.href,
      );
      history.pushState(
        { journal: { depth: depth + 1, scroll: 0, fromItem } },
        "",
        next,
      );
    } else history.replaceState(history.state, "", next);
    setSearch(location.search);
  };
  const back = () => {
    if (history.state?.journal?.depth) history.back();
    else {
      update({ item: null, tab: null, relation: null });
      window.scrollTo(0, 0);
    }
  };
  return { params: new URLSearchParams(search), update, back };
}
