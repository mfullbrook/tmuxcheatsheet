"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, ALL_BINDINGS } from "@/lib/data/keybindings";
import { CLI_COMMANDS } from "@/lib/data/cli-commands";
import { COMMAND_PAGES } from "@/lib/data/command-pages";
import type { KeyBinding, CliCommand } from "@/lib/data/types";
import type { BindingOverlay, CustomBinding, OverlayModel } from "@/lib/config-parser/overlay";
import { bestScore } from "@/lib/search";
import { CATEGORY_COLOR, CopyButton, KeyCombo, Pane, PrefixPicker } from "./ui";
import { useTmuxSite } from "./KeyboardProvider";
import { useConfig } from "./ConfigProvider";

const PAGE_SLUGS = new Set(COMMAND_PAGES.map((p) => p.slug));

const STATUS_MARK: Record<string, { label: string; cls: string }> = {
  rebound: { label: "rebound", cls: "text-accent border-accent-dim" },
  remapped: { label: "remapped", cls: "text-cat-resize border-cat-resize" },
  modified: { label: "modified", cls: "text-cat-resize border-cat-resize" },
};

function BindingRow({ b, ov }: { b: KeyBinding; ov?: BindingOverlay }) {
  const { prefix } = useTmuxSite();
  const hasPage = PAGE_SLUGS.has(b.id);
  const status = ov?.status ?? "default";
  const unbound = status === "unbound";
  const changed =
    status === "rebound" || status === "remapped" || status === "modified";
  const mark = STATUS_MARK[status];
  const displayKeys = changed && ov ? ov.userKeys.join(" ") : b.keys;
  const withPrefix = b.table === "prefix" && !(changed && ov?.noPrefix);
  const copyKeys = withPrefix ? `${prefix} ${displayKeys}` : displayKeys;
  const inner = (
    <>
      <span className="w-40 sm:w-44 shrink-0 pt-px">
        {unbound ? (
          <span className="line-through opacity-60 decoration-cat-resize">
            <KeyCombo keys={b.keys} withPrefix={b.table === "prefix"} />
          </span>
        ) : (
          <KeyCombo keys={displayKeys} withPrefix={withPrefix} />
        )}
      </span>
      <span className="flex-1 min-w-0">
        <span className="text-fg group-hover:text-accent transition-colors">
          {b.label}
        </span>
        {mark && (
          <span
            className={
              "ml-2 align-middle border px-1 text-[10px] uppercase tracking-wide " +
              mark.cls
            }
          >
            {mark.label}
          </span>
        )}
        {unbound && (
          <span className="ml-2 text-[11px] text-cat-resize">
            unbound in your config
          </span>
        )}
        {changed && ov && ov.annotations.length > 0 && (
          <span className="block text-[11px] text-cat-resize mt-0.5">
            {ov.annotations.join(" · ")}
          </span>
        )}
        {b.note && (
          <span className="block text-[12px] text-faint mt-0.5">{b.note}</span>
        )}
      </span>
      <span className="print-hidden hidden md:flex items-center gap-2 max-w-[45%] opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2 bg-hover pl-2">
        <code className="text-[11px] text-faint truncate">{b.command}</code>
        <CopyButton text={copyKeys} />
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
      <span className="print-hidden shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={c.cmd} />
      </span>
    </div>
  );
}

function CustomRow({ cb }: { cb: CustomBinding }) {
  return (
    <div className="flex items-start gap-3 px-3 py-1.5 hover:bg-hover">
      <span className="w-40 sm:w-44 shrink-0 pt-px">
        <KeyCombo keys={cb.key} withPrefix={cb.table === "prefix"} />
      </span>
      <span className="flex-1 min-w-0">
        {cb.note ? (
          <>
            <span className="text-fg">{cb.note}</span>
            <code className="block text-[11px] text-faint mt-0.5 break-all">
              {cb.command}
            </code>
          </>
        ) : (
          <code className="text-[12.5px] text-fg break-all">{cb.command}</code>
        )}
        {(cb.chained || cb.braceBlock || cb.table === "copy-mode-vi") && (
          <span className="block text-[11px] text-faint mt-0.5">
            {[
              cb.table === "copy-mode-vi" ? "copy mode (vi)" : null,
              cb.braceBlock ? "command block (not interpreted)" : null,
              cb.chained ? "chained commands" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </span>
    </div>
  );
}

/** "Your other bindings" — user bindings matching no dataset entry (top of sheet). */
function OtherBindingsPane({ overlay }: { overlay: OverlayModel }) {
  const withPrefix = overlay.customBindings.filter((cb) => !cb.noPrefix);
  const noPrefix = overlay.customBindings.filter((cb) => cb.noPrefix);
  if (withPrefix.length === 0 && noPrefix.length === 0) return null;
  return (
    <Pane
      id="your-other-bindings"
      title="your other bindings"
      color="var(--accent)"
      className="mb-8"
    >
      <p className="px-3 pt-3 pb-1 text-[12.5px] text-muted">
        from your config — bindings that don&apos;t map onto a default.
      </p>
      <div className="py-2">
        {withPrefix.map((cb, i) => (
          <CustomRow key={`p-${cb.table}-${cb.key}-${i}`} cb={cb} />
        ))}
        {noPrefix.length > 0 && (
          <>
            <p className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-faint border-t border-edge mt-2">
              no prefix needed
            </p>
            {noPrefix.map((cb, i) => (
              <CustomRow key={`n-${cb.table}-${cb.key}-${i}`} cb={cb} />
            ))}
          </>
        )}
      </div>
    </Pane>
  );
}

export function CheatSheet() {
  const [filter, setFilter] = useState("");
  const [essentialsOnly, setEssentialsOnly] = useState(false);
  const { overlay, showDefaults, status, setShowDefaults } = useConfig();

  // SSR renders defaults; the overlay only exists client-side post-hydration.
  const ov = status === "active" && !showDefaults ? overlay : null;

  const { bindings, clis, wiped } = useMemo(() => {
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
            extra: [
              ...(b.aliases ?? []),
              b.command,
              b.keys,
              ...(ov?.entries.get(b.id)?.userKeys ?? []),
            ],
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
    // T9: rows wiped by `unbind -a` collapse into one group instead of
    // striking out entire tables; explicit unbinds stay struck inline.
    let wiped: KeyBinding[] = [];
    if (ov && ov.unbindAllTables.size > 0) {
      wiped = bs.filter((b) => ov.entries.get(b.id)?.viaUnbindAll);
      bs = bs.filter((b) => !ov.entries.get(b.id)?.viaUnbindAll);
    }
    return { bindings: bs, clis: cs, wiped };
  }, [filter, essentialsOnly, ov]);

  return (
    <div>
      <div className="print-hidden flex flex-wrap items-center gap-x-6 gap-y-3 mb-8">
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
        {status === "active" && (
          <button
            onClick={() => setShowDefaults(!showDefaults)}
            className={
              "border px-3 py-1.5 text-[13px] transition-colors " +
              (showDefaults
                ? "border-edge text-muted hover:text-fg"
                : "border-accent text-accent")
            }
            aria-pressed={!showDefaults}
          >
            {showDefaults ? "showing: defaults" : "showing: your keys"}
            <sup className="ml-1 text-[9px] uppercase text-cat-resize">
              beta
            </sup>
          </button>
        )}
        <PrefixPicker />
        <Link
          href="/config/explain"
          className="text-[13px] text-muted hover:text-accent"
        >
          paste your .tmux.conf →
        </Link>
      </div>

      {ov && <OtherBindingsPane overlay={ov} />}

      {ov && wiped.length > 0 && (
        <div className="mb-8 border border-cat-resize/40 bg-surface">
          <p className="px-3 py-2 text-[12.5px] text-cat-resize">
            your config runs <code>unbind -a</code> — these defaults are
            unbound wholesale, not shown struck-through row by row.
          </p>
          <details className="px-3 pb-2 text-[12.5px]">
            <summary className="cursor-pointer text-muted hover:text-fg">
              defaults unbound by your config ({wiped.length})
            </summary>
            <ul className="mt-1 pl-1">
              {wiped.map((b) => (
                <li key={b.id} className="py-0.5">
                  <span className="line-through opacity-60">
                    <KeyCombo
                      keys={b.keys}
                      withPrefix={b.table === "prefix"}
                    />
                  </span>
                  <span className="ml-2 text-muted">{b.label}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      <div className="cheatsheet-grid grid gap-x-6 gap-y-8 lg:grid-cols-2">
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
                  <BindingRow
                    key={b.id}
                    b={b}
                    ov={ov?.entries.get(b.id)}
                  />
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
        <p className="print-hidden text-muted py-12 text-center">
          nothing matches “{filter}” — try the search (<kbd>/</kbd>) for
          task-based answers, or clear the filter.
        </p>
      )}
    </div>
  );
}
