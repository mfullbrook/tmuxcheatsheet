"use client";

/**
 * ExplainTool — the /config/explain paste flow (build step 5).
 *
 * The paste box renders immediately; the parser + overlay + dataset modules
 * are dynamically imported the first time the user actually explains a
 * config, so visitors who never paste pay nothing extra (design constraint).
 *
 * Includes: paste-moment polish (T8: autofocus, drag-and-drop, Cmd/Ctrl+V
 * anywhere, Cmd/Ctrl+Enter), secret masking with per-line reveal (T4),
 * empty/edge states (T5), report affordance (T6), diff view, and the
 * apply-to-site CTA feeding ConfigProvider.
 */

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useConfig } from "./ConfigProvider";
import { useTmuxSite } from "./KeyboardProvider";
import { Pane } from "./ui";
import { OPTION_DOCS } from "@/lib/data/option-docs";
import { CONFIG_SOURCE_SESSION_KEY } from "@/lib/config-parser/storage";
import { maskSecrets, maskConfigText } from "@/lib/config-parser/secrets";
import type {
  AnnotatedLine,
  ParsedBinding,
  ParseResult,
} from "@/lib/config-parser/parse";
import type { OverlayModel } from "@/lib/config-parser/overlay";
import type { KeyBinding } from "@/lib/data/types";

/** Raw source persisted ONLY via the explicit "remember my config" opt-in. */
const REMEMBER_SOURCE_KEY = "tmuxlab:config:source:v1";

const PARSER_VERSION = "tmuxlab config parser v1 (2026-07-06)";
const REPORT_URL = "https://github.com/mfullbrook/tmuxcheatsheet/issues/new";

interface Explained {
  parsed: ParseResult;
  overlay: OverlayModel;
  /** Dataset entries by id (for labels). */
  byId: Map<string, KeyBinding>;
  /** lineNo → dataset label for matched binding lines. */
  labelByLine: Map<number, string>;
}

type ToolState =
  | { phase: "idle" }
  | { phase: "message"; text: string }
  | { phase: "not-tmux" }
  | { phase: "explained"; data: Explained };

async function loadAndExplain(source: string): Promise<ToolState> {
  const [parseMod, overlayMod, dataMod] = await Promise.all([
    import("@/lib/config-parser/parse"),
    import("@/lib/config-parser/overlay"),
    import("@/lib/data/keybindings"),
  ]);
  let parsed: ParseResult;
  try {
    parsed = parseMod.parseConfig(source);
  } catch (err) {
    if (err instanceof parseMod.NoContentError) {
      return { phase: "message", text: "nothing to parse — paste your .tmux.conf first" };
    }
    if (err instanceof parseMod.InputTooLargeError) {
      return {
        phase: "message",
        text: "config too large (over 256KB) — is that really a tmux.conf?",
      };
    }
    return { phase: "message", text: "could not parse this config" };
  }
  // T5: zero recognized lines → not a tmux config.
  if (parsed.counts.parsed === 0 && parsed.counts.recognized === 0) {
    return { phase: "not-tmux" };
  }
  const overlay = overlayMod.buildOverlay(parsed);
  const byId = new Map(dataMod.ALL_BINDINGS.map((b) => [b.id, b]));

  // Map binding source lines to the dataset label they matched, if any.
  const labelByLine = new Map<number, string>();
  for (const ub of parsed.bindings.values()) {
    for (const entry of overlay.entries.values()) {
      const hit = entry.atoms.find(
        (a) =>
          a.userKey === ub.key &&
          (a.atom.table === ub.table || (a.noPrefix && ub.table === "root")),
      );
      if (hit) {
        const label = byId.get(entry.bindingId)?.label;
        if (label) labelByLine.set(ub.lineNo, label);
        break;
      }
    }
  }
  return { phase: "explained", data: { parsed, overlay, byId, labelByLine } };
}

// ── Diff computation (pure render of overlay + options) ─────────────────

interface DiffRow {
  label: string;
  defaultKeys: string;
  userKeys: string;
  table: string;
}

function computeDiff(data: Explained) {
  const remapped: DiffRow[] = [];
  const unbound: Array<{ label: string; keys: string; table: string }> = [];
  for (const entry of data.overlay.entries.values()) {
    const b = data.byId.get(entry.bindingId);
    if (!b) continue;
    if (
      entry.status === "rebound" ||
      entry.status === "remapped" ||
      entry.status === "modified"
    ) {
      remapped.push({
        label: b.label,
        defaultKeys: b.matchKeys.join(" "),
        userKeys: entry.userKeys.join(" "),
        table: b.table,
      });
    } else if (entry.status === "unbound") {
      unbound.push({ label: b.label, keys: b.matchKeys.join(" "), table: b.table });
    }
  }
  const options = [...data.parsed.options.values()];
  return { remapped, unbound, options };
}

// ── Component ────────────────────────────────────────────────────────────

export function ExplainTool() {
  const { applyConfig, clearConfig, status, persistFailed } = useConfig();
  const { showMessage } = useTmuxSite();
  const [source, setSource] = useState("");
  const [state, setState] = useState<ToolState>({ phase: "idle" });
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);
  const [remember, setRemember] = useState(false);
  const [includeConfig, setIncludeConfig] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [dragging, setDragging] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const sourceRef = useRef(source);
  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  const explain = useCallback(async (text: string) => {
    setBusy(true);
    setApplied(false);
    setRevealed(new Set());
    if (text.trim() === "") {
      setState({
        phase: "message",
        text: "nothing to parse — paste your .tmux.conf first",
      });
      setBusy(false);
      return;
    }
    setState(await loadAndExplain(text));
    setBusy(false);
  }, []);

  // Mount: autofocus, restore session/remembered source (post-hydration,
  // same rAF pattern as ConfigProvider — SSR renders the empty box).
  useEffect(() => {
    boxRef.current?.focus();
    const raf = requestAnimationFrame(() => {
      let restored = "";
      try {
        restored = sessionStorage.getItem(CONFIG_SOURCE_SESSION_KEY) ?? "";
        if (!restored) {
          const kept = localStorage.getItem(REMEMBER_SOURCE_KEY);
          if (kept) {
            restored = kept;
            setRemember(true);
          }
        }
      } catch {
        // storage unavailable — start empty
      }
      if (restored) {
        setSource(restored);
        void explain(restored);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [explain]);

  // Keep raw source in sessionStorage while on this page (never localStorage
  // unless the remember opt-in is checked).
  const setSourceEverywhere = useCallback((text: string) => {
    setSource(text);
    try {
      sessionStorage.setItem(CONFIG_SOURCE_SESSION_KEY, text);
    } catch {
      // session persistence is best-effort
    }
  }, []);

  // T8: Cmd/Ctrl+V anywhere pastes into the box; Cmd/Ctrl+Enter explains.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "TEXTAREA" ||
          t.tagName === "INPUT" ||
          t.isContentEditable)
      ) {
        return; // let normal paste happen (including into our own box)
      }
      const text = e.clipboardData?.getData("text");
      if (!text) return;
      e.preventDefault();
      setSourceEverywhere(text);
      boxRef.current?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void explain(sourceRef.current);
      }
    };
    document.addEventListener("paste", onPaste);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("keydown", onKey);
    };
  }, [explain, setSourceEverywhere]);

  // T8: drag-and-drop a .tmux.conf file anywhere on the page.
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        e.preventDefault();
        setDragging(true);
      }
    };
    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      e.preventDefault();
      void file.text().then((text) => {
        setSourceEverywhere(text);
        void explain(text);
      });
    };
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("drop", onDrop);
    };
  }, [explain, setSourceEverywhere]);

  const onApply = () => {
    const res = applyConfig(source);
    showMessage(res.message);
    if (res.ok) {
      setApplied(true);
      if (remember) {
        try {
          localStorage.setItem(REMEMBER_SOURCE_KEY, source);
        } catch {
          showMessage("couldn't remember your config — storage unavailable");
        }
      }
    }
  };

  const onRememberChange = (checked: boolean) => {
    setRemember(checked);
    try {
      if (checked) localStorage.setItem(REMEMBER_SOURCE_KEY, source);
      else localStorage.removeItem(REMEMBER_SOURCE_KEY);
    } catch {
      showMessage("couldn't remember your config — storage unavailable");
    }
  };

  const onClear = () => {
    clearConfig();
    setApplied(false);
    try {
      localStorage.removeItem(REMEMBER_SOURCE_KEY);
    } catch {
      // best-effort
    }
    setRemember(false);
    showMessage("config cleared — the site shows stock defaults again");
  };

  const toggleReveal = (lineNo: number) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(lineNo)) next.delete(lineNo);
      else next.add(lineNo);
      return next;
    });
  };

  const data = state.phase === "explained" ? state.data : null;
  const diff = useMemo(() => (data ? computeDiff(data) : null), [data]);
  const zeroDiff =
    diff !== null &&
    data !== null &&
    diff.remapped.length === 0 &&
    diff.unbound.length === 0 &&
    diff.options.length === 0 &&
    data.overlay.customBindings.length === 0 &&
    data.overlay.unbindAllTables.size === 0 &&
    data.parsed.prefix === "C-b";

  const reportHref = useMemo(() => {
    if (!data) return REPORT_URL;
    const c = data.parsed.counts;
    let body =
      `**Parser:** ${PARSER_VERSION}\n\n` +
      `**Counts:** ${c.total} lines — ${c.parsed} parsed, ` +
      `${c.recognized} recognized, ${c.skipped} not annotated, ` +
      `${c.blankOrComment} blank/comment\n` +
      `**Warnings:** ${data.parsed.warnings.length}\n\n` +
      `**What looked wrong:**\n\n(describe here)\n`;
    if (includeConfig) {
      body += `\n**Config (secrets masked):**\n\n\`\`\`\n${maskConfigText(source)}\n\`\`\`\n`;
    }
    const params = new URLSearchParams({
      title: "Config explain report",
      body,
    });
    return `${REPORT_URL}?${params.toString()}`;
  }, [data, includeConfig, source]);

  return (
    <div className="space-y-8">
      {dragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 border-4 border-dashed border-accent text-accent text-lg pointer-events-none">
          drop your .tmux.conf to explain it
        </div>
      )}

      {/* ── Paste box ── */}
      <div>
        <textarea
          ref={boxRef}
          value={source}
          onChange={(e) => setSourceEverywhere(e.target.value)}
          spellCheck={false}
          placeholder={
            "# paste your .tmux.conf here (or drop the file anywhere on this page)\n" +
            "# nothing leaves your browser — parsing is 100% client-side"
          }
          className="w-full h-48 border border-edge bg-surface p-3 font-mono text-[13px] text-fg placeholder:text-faint focus:border-accent-dim focus:outline-none resize-y"
          aria-label="Paste your .tmux.conf"
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void explain(source)}
            disabled={busy}
            className="border border-accent-dim text-accent px-4 py-1.5 text-[13px] hover:bg-hover disabled:opacity-50"
          >
            {busy ? "reading…" : "explain"}
          </button>
          <span className="text-faint text-[12px]">
            or press Ctrl/Cmd+Enter · Ctrl/Cmd+V pastes from anywhere on the page
          </span>
        </div>
      </div>

      {state.phase === "message" && (
        <p className="text-muted text-[14px]" role="status">
          {state.text}
        </p>
      )}

      {state.phase === "not-tmux" && (
        <Pane title="hmm" className="p-4">
          <p className="text-muted text-[14px]">
            This doesn&apos;t look like a tmux config — no line was a
            recognizable tmux command. If you don&apos;t have a .tmux.conf
            yet, build one with the{" "}
            <Link href="/config/generator" className="text-accent hover:underline">
              interactive config generator
            </Link>
            .
          </p>
        </Pane>
      )}

      {data && diff && (
        <>
          <Banners data={data} persistFailed={persistFailed} />

          {/* ── Diff summary ── */}
          <Pane title="what your config changes" className="p-4">
            {zeroDiff ? (
              <p className="text-[14px] text-fg">
                <span className="text-accent">Stock defaults</span> — your
                config doesn&apos;t change any binding or option this site
                tracks. Everything on this site already matches your tmux.
              </p>
            ) : (
              <>
                <p className="text-[14px] mb-4">
                  <span className="text-accent font-medium">
                    {diff.remapped.length} remapped
                  </span>
                  <span className="text-faint"> · </span>
                  <span className="font-medium" style={{ color: "var(--cat-resize)" }}>
                    {diff.unbound.length} unbound
                  </span>
                  <span className="text-faint"> · </span>
                  <span className="font-medium" style={{ color: "var(--cat-windows)" }}>
                    {diff.options.length} option{diff.options.length === 1 ? "" : "s"} set
                  </span>
                </p>
                <DiffTables diff={diff} />
              </>
            )}
          </Pane>

          {/* ── Apply CTA ── */}
          <Pane title="make the site speak your keys" className="p-4">
            {applied ? (
              <p className="text-[14px]">
                <span className="text-accent">Config applied.</span>{" "}
                The cheat sheet, search, and command pages now speak your keys.{" "}
                <Link href="/" className="text-accent hover:underline">
                  See your cheat sheet →
                </Link>
              </p>
            ) : (
              <p className="text-muted text-[14px] mb-3">
                Apply this config and the cheat sheet, search, and command
                pages speak your keys — toggle back to defaults any time.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 mt-2">
              {!applied && (
                <button
                  onClick={onApply}
                  className="bg-accent text-black px-4 py-1.5 text-[13px] font-medium hover:opacity-90"
                >
                  apply to the whole site
                </button>
              )}
              {(status === "active" || applied) && (
                <button
                  onClick={onClear}
                  className="border border-edge text-muted px-3 py-1.5 text-[13px] hover:text-fg hover:bg-hover"
                >
                  clear config
                </button>
              )}
              <label className="flex items-center gap-2 text-[13px] text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => onRememberChange(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                remember my config on this device
              </label>
            </div>
            {persistFailed && (
              <p className="text-[12px] mt-2" style={{ color: "var(--cat-resize)" }}>
                storage is unavailable — your config works for this session
                but won&apos;t persist
              </p>
            )}
          </Pane>

          {/* ── Annotated view ── */}
          <Pane title="line by line" className="p-0">
            <AnnotatedView
              data={data}
              revealed={revealed}
              toggleReveal={toggleReveal}
            />
          </Pane>

          <SkippedGroup lines={data.parsed.lines} />

          {/* ── Report affordance (T6) ── */}
          <div className="border border-edge bg-surface p-4 text-[13px]">
            <p className="text-muted mb-2">
              Something explained wrong?{" "}
              <a
                href={reportHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                report this config
              </a>{" "}
              — opens a prefilled GitHub issue.
            </p>
            <label className="flex items-center gap-2 text-faint cursor-pointer">
              <input
                type="checkbox"
                checked={includeConfig}
                onChange={(e) => setIncludeConfig(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              include my config lines in the report (secrets masked)
            </label>
          </div>
        </>
      )}
    </div>
  );
}

// ── Banners ──────────────────────────────────────────────────────────────

function Banners({
  data,
  persistFailed,
}: {
  data: Explained;
  persistFailed: boolean;
}) {
  const banners: Array<{ key: string; text: React.ReactNode }> = [];
  if (data.parsed.hasConditionals) {
    banners.push({
      key: "cond",
      text: "conditional logic detected (%if / if-shell) — your effective config may differ from what's shown",
    });
  }
  for (const table of data.overlay.unbindAllTables) {
    banners.push({
      key: `unbind-all-${table}`,
      text: `this config unbinds all defaults in the ${table} table — strike-through is shown only for explicitly unbound keys; the rest are a collapsed "unbound" group`,
    });
  }
  for (const path of data.parsed.sourcesFiles) {
    banners.push({
      key: `src-${path}`,
      text: (
        <>
          this config sources <code className="text-fg">{path}</code> — paste
          that file too for full coverage
        </>
      ),
    });
  }
  if (data.parsed.options.get("mode-keys")?.value === "emacs") {
    banners.push({
      key: "emacs",
      text: "your copy mode is emacs; the copy-mode section of this site shows vi defaults",
    });
  }
  if (persistFailed) {
    banners.push({
      key: "persist",
      text: "browser storage is unavailable — personalization won't persist beyond this session",
    });
  }
  if (banners.length === 0) return null;
  return (
    <div className="space-y-2">
      {banners.map((b) => (
        <div
          key={b.key}
          className="border border-edge bg-surface px-3 py-2 text-[13px] text-muted"
          style={{ borderLeft: "3px solid var(--cat-resize)" }}
        >
          {b.text}
        </div>
      ))}
    </div>
  );
}

// ── Diff tables ──────────────────────────────────────────────────────────

function DiffTables({ diff }: { diff: ReturnType<typeof computeDiff> }) {
  return (
    <div className="space-y-5">
      {diff.remapped.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-faint">
                <th className="pr-4 py-1 font-normal">your key</th>
                <th className="pr-4 py-1 font-normal">default</th>
                <th className="py-1 font-normal">binding</th>
              </tr>
            </thead>
            <tbody>
              {diff.remapped.map((r, i) => (
                <tr key={i} className="border-t border-edge">
                  <td className="pr-4 py-1">
                    <kbd className="text-accent">{r.userKeys}</kbd>
                  </td>
                  <td className="pr-4 py-1 text-faint">
                    <kbd>{r.defaultKeys}</kbd>
                  </td>
                  <td className="py-1 text-muted">
                    {r.label}
                    {r.table !== "prefix" && (
                      <span className="text-faint"> ({r.table})</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {diff.unbound.length > 0 && (
        <div className="overflow-x-auto">
          <div className="text-[12px] text-faint mb-1">unbound defaults</div>
          <table className="w-full text-[13px]">
            <tbody>
              {diff.unbound.map((r, i) => (
                <tr key={i} className="border-t border-edge">
                  <td className="pr-4 py-1">
                    <kbd className="line-through text-faint">{r.keys}</kbd>
                  </td>
                  <td className="py-1 text-muted">
                    {r.label}
                    {r.table !== "prefix" && (
                      <span className="text-faint"> ({r.table})</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {diff.options.length > 0 && (
        <div className="overflow-x-auto">
          <div className="text-[12px] text-faint mb-1">options set</div>
          <table className="w-full text-[13px]">
            <tbody>
              {diff.options.map((o) => (
                <tr key={o.name} className="border-t border-edge">
                  <td className="pr-4 py-1 font-mono text-fg">{o.name}</td>
                  <td className="py-1 font-mono text-muted">
                    <MaskedText text={o.value ?? "(toggle)"} />
                    {o.appended && (
                      <span className="text-faint font-sans"> (appended)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Inline value with render-time secret masking (no reveal; tables). */
function MaskedText({ text }: { text: string }) {
  const { masked } = maskSecrets(text);
  return <>{masked}</>;
}

// ── Annotated line-by-line view ─────────────────────────────────────────

const KIND_COLOR: Record<AnnotatedLine["kind"], string> = {
  binding: "var(--cat-sessions)",
  unbind: "var(--cat-resize)",
  option: "var(--cat-windows)",
  annotation: "var(--cat-buffers)",
  recognized: "var(--cat-copy)",
  skipped: "var(--text-faint)",
  blank: "transparent",
  comment: "transparent",
};

function AnnotatedView({
  data,
  revealed,
  toggleReveal,
}: {
  data: Explained;
  revealed: Set<number>;
  toggleReveal: (lineNo: number) => void;
}) {
  const bindingsByLine = useMemo(() => {
    const m = new Map<number, ParsedBinding>();
    for (const b of data.parsed.bindings.values()) m.set(b.lineNo, b);
    return m;
  }, [data]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <tbody>
          {data.parsed.lines.map((line) => (
            <LineRow
              key={line.lineNo}
              line={line}
              data={data}
              binding={bindingsByLine.get(line.lineNo)}
              revealed={revealed.has(line.lineNo)}
              toggleReveal={toggleReveal}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LineRow({
  line,
  data,
  binding,
  revealed,
  toggleReveal,
}: {
  line: AnnotatedLine;
  data: Explained;
  binding: ParsedBinding | undefined;
  revealed: boolean;
  toggleReveal: (lineNo: number) => void;
}) {
  const mask = maskSecrets(line.raw);
  const shown = mask.hasSecret && !revealed ? mask.masked : line.raw;
  const quiet = line.kind === "blank" || line.kind === "comment";

  // Meaning parts: parser explanations + enrichments.
  const parts: React.ReactNode[] = [];
  if (!quiet) {
    const label = data.labelByLine.get(line.lineNo);
    if (line.kind === "binding" && label) {
      parts.push(
        <span key="label" className="text-fg">
          {label}
        </span>,
      );
    }
    line.explanation.forEach((e, i) => {
      parts.push(
        <span key={`e${i}`} className="text-muted">
          {e}
        </span>,
      );
    });
    if (line.kind === "option") {
      // Option summary from the shared docs.
      const name = optionNameOf(line, data);
      const doc = name ? OPTION_DOCS[name] : undefined;
      if (doc) {
        parts.push(
          <span key="doc" className="text-faint">
            {doc.summary.replace(/\n/g, " ")}
          </span>,
        );
        if (doc.link && !line.refs.includes(doc.link)) {
          parts.push(
            <Link key="doclink" href={doc.link} className="text-accent hover:underline">
              learn more →
            </Link>,
          );
        }
      }
    }
    if (
      line.kind === "binding" &&
      binding &&
      /#\{pane_current_path\}/.test(binding.command)
    ) {
      parts.push(
        <span key="cwd" className="text-faint">
          + opens in current directory
        </span>,
      );
    }
    line.warnings.forEach((w, i) => {
      parts.push(
        <span key={`w${i}`} style={{ color: "var(--cat-resize)" }}>
          ⚠ {w.message}
          {w.link && (
            <>
              {" "}
              <Link href={w.link} className="text-accent hover:underline">
                read why →
              </Link>
            </>
          )}
        </span>,
      );
    });
  }

  return (
    <tr className="border-t border-edge align-top hover:bg-hover">
      <td className="pl-3 pr-2 py-1 text-right text-faint select-none w-10 font-mono">
        {line.lineNo}
        {line.endLineNo !== line.lineNo && (
          <span className="text-faint">–{line.endLineNo}</span>
        )}
      </td>
      <td className="px-2 py-1 w-1 whitespace-nowrap">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full align-middle"
          style={{ background: KIND_COLOR[line.kind] }}
          title={line.kind}
        />
      </td>
      <td className="px-2 py-1 font-mono whitespace-pre-wrap break-all max-w-[42ch] sm:max-w-none">
        <span className={quiet ? "text-faint" : "text-fg"}>{shown}</span>
        {mask.hasSecret && (
          <button
            onClick={() => toggleReveal(line.lineNo)}
            className="ml-2 text-faint hover:text-accent"
            title={revealed ? "hide secret" : "reveal secret"}
            aria-label={revealed ? "hide secret" : "reveal secret"}
          >
            {revealed ? "◉" : "👁"}
          </button>
        )}
      </td>
      <td className="px-3 py-1 text-[12.5px]">
        <span className="inline-flex flex-wrap gap-x-2 gap-y-0.5">
          {parts.map((p, i) => (
            <span key={i}>
              {i > 0 && <span className="text-faint mr-2">·</span>}
              {p}
            </span>
          ))}
        </span>
      </td>
    </tr>
  );
}

function optionNameOf(line: AnnotatedLine, data: Explained): string | null {
  for (const [name, opt] of data.parsed.options) {
    if (opt.lineNo === line.lineNo) return name;
  }
  // Fall back to scanning the raw line's second-ish word.
  const m = line.raw.trim().match(/^set(?:w|-option|-window-option)?\s+(?:-\S+\s+)*([@\w-]+)/);
  return m ? m[1] : null;
}

// ── Skipped-lines group (honest "not annotated") ─────────────────────────

function SkippedGroup({ lines }: { lines: AnnotatedLine[] }) {
  const skipped = lines.filter((l) => l.kind === "skipped");
  if (skipped.length === 0) return null;
  return (
    <details className="border border-edge bg-surface text-[13px]">
      <summary className="px-4 py-2 cursor-pointer text-muted hover:text-fg">
        not annotated ({skipped.length} line{skipped.length === 1 ? "" : "s"})
        — this tool reads, it doesn&apos;t interpret
      </summary>
      <ul className="px-4 pb-3 space-y-1">
        {skipped.map((l) => (
          <li key={l.lineNo} className="text-faint">
            <span className="font-mono">line {l.lineNo}</span>
            {" — "}
            {l.explanation[0] ?? "unrecognized"}
          </li>
        ))}
      </ul>
    </details>
  );
}
