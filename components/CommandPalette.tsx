"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_BINDINGS } from "@/lib/data/keybindings";
import { CLI_COMMANDS } from "@/lib/data/cli-commands";
import { COMMAND_PAGES } from "@/lib/data/command-pages";
import { SITE_WINDOWS } from "@/lib/site-nav";
import { bestScore } from "@/lib/search";
import { useTmuxSite } from "./KeyboardProvider";
import { useOptionalConfig } from "./ConfigProvider";
import { copyText } from "@/lib/copy";

interface Item {
  kind: "page" | "binding" | "cli";
  title: string;
  detail: string;
  action: "go" | "copy";
  href?: string;
  copyText?: string;
  score: number;
}

const COMMAND_PAGE_IDS = new Set(COMMAND_PAGES.map((p) => p.slug));

/** Mounted only while open, so query/selection state resets naturally. */
export function CommandPalette() {
  const { paletteOpen } = useTmuxSite();
  if (!paletteOpen) return null;
  return <PaletteDialog />;
}

function PaletteDialog() {
  const router = useRouter();
  const { setPaletteOpen, prefix, showMessage } = useTmuxSite();
  const config = useOptionalConfig();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  // Overlay-aware display + search: when a config is active (and defaults
  // aren't toggled on), bindings match and show the user's effective keys.
  const ov =
    config && config.status === "active" && !config.showDefaults
      ? config.overlay
      : null;

  const results = useMemo<Item[]>(() => {
    const items: Item[] = [];
    for (const w of SITE_WINDOWS) {
      const s = bestScore(query, { text: w.name, extra: [w.href] });
      if (s > 0 || !query) {
        items.push({
          kind: "page",
          title: `${w.index}:${w.name}`,
          detail: w.href,
          action: "go",
          href: w.href,
          score: (s > 0 ? s : 0) + 5,
        });
      }
    }
    for (const b of ALL_BINDINGS) {
      const entry = ov?.entries.get(b.id);
      const changed =
        entry &&
        (entry.status === "rebound" ||
          entry.status === "remapped" ||
          entry.status === "modified");
      const s = bestScore(query, {
        text: b.label,
        extra: [
          ...(b.aliases ?? []),
          b.command,
          b.keys,
          ...(changed ? entry.userKeys : []),
        ],
      });
      if (s > 0 || (!query && b.essential)) {
        const effKeys = changed ? entry.userKeys.join(" ") : b.keys;
        const withPrefix = b.table === "prefix" && !(changed && entry.noPrefix);
        let keys = withPrefix ? `${prefix} ${effKeys}` : effKeys;
        if (entry?.status === "unbound") keys = `${keys} (unbound)`;
        items.push({
          kind: "binding",
          title: b.label,
          detail: keys,
          action: "go",
          href: COMMAND_PAGE_IDS.has(b.id) ? `/commands/${b.id}` : `/#${b.id}`,
          score: s > 0 ? s : 0,
        });
      }
    }
    for (const c of CLI_COMMANDS) {
      const s = bestScore(query, {
        text: c.label,
        extra: [...(c.aliases ?? []), c.cmd],
      });
      if (s > 0 || (!query && c.essential)) {
        items.push({
          kind: "cli",
          title: c.label,
          detail: c.cmd,
          action: "copy",
          copyText: c.cmd,
          score: s > 0 ? s : 0,
        });
      }
    }
    return items.sort((a, b) => b.score - a.score).slice(0, 12);
  }, [query, prefix, ov]);

  function execute(item: Item) {
    if (item.action === "copy" && item.copyText) {
      const text = item.copyText;
      copyText(text).then((ok) => {
        showMessage(
          ok ? `copied: ${text}` : "copy failed — select manually",
        );
      });
      setPaletteOpen(false);
    } else if (item.href) {
      setPaletteOpen(false);
      if (item.href.startsWith("/#")) {
        // Same-page anchor: navigate and let the browser scroll.
        window.location.href = item.href;
      } else {
        router.push(item.href);
      }
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[selected];
      if (item) execute(item);
    } else if (e.key === "Escape") {
      setPaletteOpen(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-[12vh] px-4"
      onClick={() => setPaletteOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div
        className="w-full max-w-xl bg-surface border border-edge-bright shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-edge px-3 py-2.5">
          <span className="text-accent">(search)</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent outline-none text-fg placeholder:text-faint"
            placeholder="split pane, copy paste, kill session…"
            aria-label="Search commands and keybindings"
          />
          <kbd className="text-faint">esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-1">
          {results.length === 0 && (
            <li className="px-3 py-4 text-muted">
              no matches — try a task, like “scroll” or “rename”
            </li>
          )}
          {results.map((item, i) => (
            <li key={`${item.kind}-${item.title}-${item.detail}`}>
              <button
                className={
                  "w-full flex items-center gap-3 px-3 py-1.5 text-left " +
                  (i === selected ? "bg-hover text-fg" : "text-muted")
                }
                onMouseEnter={() => setSelected(i)}
                onClick={() => execute(item)}
              >
                <span className="flex-1 truncate">{item.title}</span>
                <span
                  className={
                    "shrink-0 text-[12px] " +
                    (item.kind === "cli" ? "text-cat-buffers" : "text-accent")
                  }
                >
                  {item.detail}
                </span>
                <span className="shrink-0 w-10 text-right text-[11px] text-faint">
                  {item.action === "copy" ? "↵ copy" : "↵ go"}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-edge px-3 py-1.5 text-[11px] text-faint flex gap-4">
          <span>↑↓ move</span>
          <span>↵ select</span>
          <span>C-b w reopen</span>
        </div>
      </div>
    </div>
  );
}
