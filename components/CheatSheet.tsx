"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, ALL_BINDINGS } from "@/lib/data/keybindings";
import { CLI_COMMANDS } from "@/lib/data/cli-commands";
import { COMMAND_PAGES } from "@/lib/data/command-pages";
import type { KeyBinding, CliCommand } from "@/lib/data/types";
import { bestScore } from "@/lib/search";
import { CATEGORY_COLOR, CopyButton, KeyCombo, Pane, PrefixPicker } from "./ui";
import { useTmuxSite } from "./KeyboardProvider";

const PAGE_SLUGS = new Set(COMMAND_PAGES.map((p) => p.slug));

function BindingRow({ b }: { b: KeyBinding }) {
  const { prefix } = useTmuxSite();
  const hasPage = PAGE_SLUGS.has(b.id);
  const inner = (
    <>
      <span className="w-40 sm:w-44 shrink-0 pt-px">
        <KeyCombo keys={b.keys} withPrefix={b.table === "prefix"} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="text-fg group-hover:text-accent transition-colors">
          {b.label}
        </span>
        {b.note && (
          <span className="block text-[12px] text-faint mt-0.5">{b.note}</span>
        )}
      </span>
      <span className="hidden md:flex items-center gap-2 max-w-[45%] opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2 bg-hover pl-2">
        <code className="text-[11px] text-faint truncate">{b.command}</code>
        <CopyButton
          text={b.table === "prefix" ? `${prefix} ${b.keys}` : b.keys}
        />
        {hasPage && <span className="text-[11px] text-accent">→</span>}
      </span>
    </>
  );
  const cls =
    "group relative flex items-start gap-3 px-3 py-1.5 hover:bg-hover scroll-mt-20";
  return hasPage ? (
    <Link id={b.id} href={`/commands/${b.id}`} className={cls}>
      {inner}
    </Link>
  ) : (
    <div id={b.id} className={cls}>
      {inner}
    </div>
  );
}

function CliRow({ c }: { c: CliCommand }) {
  return (
    <div
      id={c.id}
      className="group flex items-start gap-3 px-3 py-1.5 hover:bg-hover scroll-mt-20"
    >
      <span className="w-40 sm:w-44 shrink-0 pt-px min-w-0">
        <code className="text-cat-buffers text-[13px] break-all">
          <span className="text-faint select-none">$ </span>
          {c.cmd}
        </code>
      </span>
      <span className="flex-1 min-w-0">
        <span className="text-fg">{c.label}</span>
        {c.note && (
          <span className="block text-[12px] text-faint mt-0.5">{c.note}</span>
        )}
      </span>
      <span className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={c.cmd} />
      </span>
    </div>
  );
}

export function CheatSheet() {
  const [filter, setFilter] = useState("");
  const [essentialsOnly, setEssentialsOnly] = useState(false);

  const { bindings, clis } = useMemo(() => {
    let bs = ALL_BINDINGS;
    let cs = CLI_COMMANDS;
    if (essentialsOnly) {
      bs = bs.filter((b) => b.essential);
      cs = cs.filter((c) => c.essential);
    }
    if (filter.trim()) {
      bs = bs.filter(
        (b) =>
          bestScore(filter, {
            text: b.label,
            extra: [...(b.aliases ?? []), b.command, b.keys],
          }) > 0,
      );
      cs = cs.filter(
        (c) =>
          bestScore(filter, {
            text: c.label,
            extra: [...(c.aliases ?? []), c.cmd],
          }) > 0,
      );
    }
    return { bindings: bs, clis: cs };
  }, [filter, essentialsOnly]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-8">
        <label className="flex items-center gap-2 border border-edge bg-surface px-3 py-1.5 focus-within:border-accent-dim min-w-[240px] flex-1 max-w-sm">
          <span className="text-accent select-none">/</span>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="filter: scroll, rename, kill…"
            className="bg-transparent outline-none flex-1 placeholder:text-faint text-[13px]"
            aria-label="Filter the cheat sheet"
          />
        </label>
        <button
          onClick={() => setEssentialsOnly((v) => !v)}
          className={
            "border px-3 py-1.5 text-[13px] transition-colors " +
            (essentialsOnly
              ? "border-accent text-accent"
              : "border-edge text-muted hover:text-fg")
          }
        >
          {essentialsOnly ? "[x]" : "[ ]"} essentials only
        </button>
        <PrefixPicker />
      </div>

      <div className="grid gap-x-6 gap-y-8 lg:grid-cols-2">
        {CATEGORIES.map((cat) => {
          const catBindings = bindings.filter((b) => b.category === cat.id);
          const catClis = clis.filter((c) => c.category === cat.id);
          if (catBindings.length === 0 && catClis.length === 0) return null;
          const color = CATEGORY_COLOR[cat.id];
          return (
            <Pane key={cat.id} id={cat.id} title={cat.title} color={color}>
              <p className="px-3 pt-3 pb-1 text-[12.5px] text-muted">
                {cat.blurb}
              </p>
              <div className="py-2">
                {catBindings.map((b) => (
                  <BindingRow key={b.id} b={b} />
                ))}
                {catClis.length > 0 && catBindings.length > 0 && (
                  <div className="mx-3 my-2 border-t border-edge" />
                )}
                {catClis.map((c) => (
                  <CliRow key={c.id} c={c} />
                ))}
              </div>
            </Pane>
          );
        })}
      </div>

      {bindings.length === 0 && clis.length === 0 && (
        <p className="text-muted py-12 text-center">
          nothing matches “{filter}” — try the search (<kbd>/</kbd>) for
          task-based answers, or clear the filter.
        </p>
      )}
    </div>
  );
}
