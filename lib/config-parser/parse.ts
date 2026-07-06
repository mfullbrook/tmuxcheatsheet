/**
 * .tmux.conf reader — implements the Parser Contract.
 *
 * The parser is a reader, not an interpreter: it emits an ordered event
 * list applied in source order (last-wins, tmux's own semantics) and
 * computes the resolved result from that stream. Unrecognized lines are
 * skipped and surfaced with counts + line references, never an error wall.
 *
 * Browser-safe: no platform APIs.
 */

import { KNOWN_COMMANDS } from "./aliases";
import { canonicalKey, expandAlias } from "./normalize";
import {
  isBlank,
  isComment,
  toLogicalLines,
  tokenizeLine,
  type Token,
} from "./tokenize";

// ── Types ───────────────────────────────────────────────────────────────

/** How a source line was classified for the explain view. */
export type LineKind =
  | "binding"
  | "unbind"
  | "option"
  | "annotation"
  | "recognized"
  | "skipped"
  | "blank"
  | "comment";

export interface Warning {
  /** Stale-advice rule id ("stale-1".."stale-6") or a parser warning id. */
  ruleId?: string;
  message: string;
  /** Site route with the relevant guide/command page, when one exists. */
  link?: string;
  lineNo: number;
}

/** Per-source-line record for the line-by-line explain view. */
export interface AnnotatedLine {
  lineNo: number;
  endLineNo: number;
  raw: string;
  kind: LineKind;
  /** Human-readable explanation parts (empty for blank/comment). */
  explanation: string[];
  warnings: Warning[];
  /** Related site routes (guides/command pages). */
  refs: string[];
}

export interface ParsedBinding {
  table: string;
  /** Canonical key (list-keys notation). */
  key: string;
  /** First command of the binding, verbatim (tokens re-joined). */
  command: string;
  /** Canonical command name (alias-expanded), null for brace blocks. */
  commandName: string | null;
  /** -N note, when present. */
  note?: string;
  /** Bound with -r (repeatable). */
  repeatable: boolean;
  /** True if the command was a `\;` chain — never a clean match (T10). */
  chained: boolean;
  /** Number of chained commands beyond the first. */
  chainedCount: number;
  /** True if the command is a `{ ... }` block (not interpreted). */
  braceBlock: boolean;
  lineNo: number;
}

export interface ParsedOption {
  name: string;
  /** null for valueless `set` (toggle) or `-u` unset. */
  value: string | null;
  /** Raw scope/behavior flags seen (g, s, w, q, a, u, F, o). */
  flags: string[];
  /** True for -a/-ga append forms (value recorded, not merged). */
  appended: boolean;
  /** True for -u/-gu (handled in the event stream as unset). */
  unset: boolean;
  lineNo: number;
}

export interface SkippedLine {
  lineNo: number;
  endLineNo: number;
  raw: string;
  /** Why it was skipped ("if-shell", "hook", "%if block", "unrecognized"...). */
  reason: string;
}

/** A captured environment assignment (for downstream secret masking). */
export interface EnvAssignment {
  name: string;
  value: string | null;
  lineNo: number;
}

export interface ParseCounts {
  /** Logical lines in the input. */
  total: number;
  /** Lines parsed and applied (bindings, unbinds, options, annotations). */
  parsed: number;
  /** Lines recognized for annotation only. */
  recognized: number;
  skipped: number;
  blankOrComment: number;
}

export interface ParseResult {
  /** Resolved prefix key (canonical), default "C-b". */
  prefix: string;
  /** Live bindings keyed by `"<table> <canonical key>"`. */
  bindings: Map<string, ParsedBinding>;
  /** Explicitly unbound `(table, key)` pairs still unbound at the end. */
  unbinds: Set<string>;
  /** Tables wiped by `unbind -a` (T9: render as a collapsed group). */
  unbindAllTables: Set<string>;
  /** Whitelisted + annotation-only options, keyed by option name. */
  options: Map<string, ParsedOption>;
  /** `set -g @plugin` values, in source order. */
  plugins: string[];
  /** setenv/set-environment assignments (values need secret masking). */
  environment: EnvAssignment[];
  /** Paths named by `source-file` lines ("paste that file too"). */
  sourcesFiles: string[];
  /** True if %if or if-shell appears anywhere (T10 banner). */
  hasConditionals: boolean;
  warnings: Warning[];
  skipped: SkippedLine[];
  /** One record per logical line, in source order. */
  lines: AnnotatedLine[];
  counts: ParseCounts;
}

/** Thrown for empty/whitespace-only input (caller shows a message). */
export class NoContentError extends Error {
  constructor() {
    super("No content to parse");
    this.name = "NoContentError";
  }
}

/** Input cap (256 KB) — enforced by the caller, defensively re-checked. */
export const MAX_INPUT_BYTES = 262144;

/** Thrown when input exceeds MAX_INPUT_BYTES. */
export class InputTooLargeError extends Error {
  constructor() {
    super("Input exceeds the 256KB limit");
    this.name = "InputTooLargeError";
  }
}

// ── Whitelists ──────────────────────────────────────────────────────────

/** Options that affect site rendering. */
const RENDER_OPTIONS = new Set(["prefix", "mode-keys", "mouse"]);

/** Annotation-only options (explain + "other settings"). */
const ANNOTATION_OPTIONS: Record<string, string> = {
  "base-index": "number windows starting from",
  "pane-base-index": "number panes starting from",
  "renumber-windows": "renumber windows when one closes",
  "history-limit": "scrollback lines kept per pane",
  "escape-time": "ms tmux waits after Escape",
  "focus-events": "pass terminal focus events to programs",
  "default-terminal": "the $TERM tmux advertises",
  "set-clipboard": "let programs set the system clipboard (OSC 52)",
  "status-position": "status bar position",
};

/** Status-styling options the generator emits (echoed, not interpreted). */
const STYLING_OPTIONS = new Set([
  "status-style",
  "status-left",
  "status-left-length",
  "status-right",
  "status-right-length",
  "window-status-current-style",
]);

/** Pre-2.1 mouse options (stale rule 4). */
const LEGACY_MOUSE_OPTIONS = new Set([
  "mode-mouse",
  "mouse-select-pane",
  "mouse-resize-pane",
  "mouse-select-window",
  "mouse-utf8",
]);

const BINDING_TABLES = new Set(["prefix", "root", "copy-mode-vi"]);

const STALE_LINKS = {
  reattach: "/commands/copy-to-system-clipboard",
  colors: "/guides/tmux-colors",
  copyPaste: "/commands/copy-paste",
  mouse: "/commands/mouse-mode",
  historyLimit: "/commands/history-limit",
};

// ── Events ──────────────────────────────────────────────────────────────

type ConfigEvent =
  | { type: "bind"; binding: ParsedBinding }
  | { type: "unbind"; table: string; key: string; lineNo: number }
  | { type: "unbind-all"; table: string; lineNo: number }
  | { type: "set-option"; option: ParsedOption }
  | { type: "unset-option"; name: string; lineNo: number };

// ── Helpers ─────────────────────────────────────────────────────────────

function joinTokens(tokens: Token[]): string {
  return tokens
    .map((t) => {
      if (t.brace) return t.value;
      if (t.quoted || /\s/.test(t.value) || t.value === "") {
        return `"${t.value.replace(/"/g, '\\"')}"`;
      }
      return t.value;
    })
    .join(" ");
}

/**
 * Parse flags for bind/unbind/set lines. Minimal, table-driven: `valued`
 * lists flag letters that consume a value (supports attached values like
 * `-Tcopy-mode`).
 */
function takeFlags(
  tokens: Token[],
  valued: Set<string>,
): { flags: Map<string, string | null>; rest: Token[] } {
  const flags = new Map<string, string | null>();
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    const v = t.value;
    if (t.quoted || t.brace || !/^-[A-Za-z0-9]/.test(v)) break;
    if (v === "--") {
      i++;
      break;
    }
    let j = 1;
    while (j < v.length) {
      const ch = v[j];
      if (valued.has(ch)) {
        const attached = v.slice(j + 1);
        if (attached.length > 0) flags.set(ch, attached);
        else if (i + 1 < tokens.length) {
          i++;
          flags.set(ch, tokens[i].value);
        } else flags.set(ch, null);
        j = v.length;
      } else {
        flags.set(ch, null);
        j++;
      }
    }
    i++;
  }
  return { flags, rest: tokens.slice(i) };
}

const SECRETISH = /(TOKEN|KEY|SECRET|PASSWORD|PASSWD|CREDENTIAL)/i;

// ── The parser ──────────────────────────────────────────────────────────

/**
 * Parse .tmux.conf text per the Parser Contract.
 *
 * @throws NoContentError for empty/whitespace-only input.
 * @throws InputTooLargeError past MAX_INPUT_BYTES (defensive re-check).
 */
export function parseConfig(source: string): ParseResult {
  if (source.trim() === "") throw new NoContentError();
  if (source.length > MAX_INPUT_BYTES) throw new InputTooLargeError();

  const logical = toLogicalLines(source);
  const events: ConfigEvent[] = [];
  const warnings: Warning[] = [];
  const skipped: SkippedLine[] = [];
  const lines: AnnotatedLine[] = [];
  const sourcesFiles: string[] = [];
  const plugins: string[] = [];
  const environment: EnvAssignment[] = [];
  let hasConditionals = false;

  const counts: ParseCounts = {
    total: logical.length,
    parsed: 0,
    recognized: 0,
    skipped: 0,
    blankOrComment: 0,
  };

  /** %if nesting depth — contents of %if blocks are skipped (conditional). */
  let ifDepth = 0;

  for (const line of logical) {
    const annotated: AnnotatedLine = {
      lineNo: line.lineNo,
      endLineNo: line.endLineNo,
      raw: line.raw,
      kind: "skipped",
      explanation: [],
      warnings: [],
      refs: [],
    };
    lines.push(annotated);

    const warn = (message: string, ruleId?: string, link?: string) => {
      const w: Warning = { message, ruleId, link, lineNo: line.lineNo };
      warnings.push(w);
      annotated.warnings.push(w);
      if (link && !annotated.refs.includes(link)) annotated.refs.push(link);
    };
    const skip = (reason: string) => {
      annotated.kind = "skipped";
      annotated.explanation.push(reason);
      skipped.push({
        lineNo: line.lineNo,
        endLineNo: line.endLineNo,
        raw: line.raw,
        reason,
      });
      counts.skipped++;
    };

    if (isBlank(line)) {
      annotated.kind = "blank";
      counts.blankOrComment++;
      continue;
    }
    if (isComment(line)) {
      annotated.kind = "comment";
      counts.blankOrComment++;
      continue;
    }

    const trimmed = line.text.trim();

    // %if / %elif / %else / %endif — conditional blocks are skipped wholesale.
    if (trimmed.startsWith("%")) {
      const directive = trimmed.split(/\s+/)[0];
      if (directive === "%if") {
        hasConditionals = true;
        ifDepth++;
        skip("conditional block (%if) — not evaluated");
        continue;
      }
      if (directive === "%endif") {
        if (ifDepth > 0) ifDepth--;
        skip("end of conditional block");
        continue;
      }
      if (directive === "%elif" || directive === "%else") {
        skip("conditional block branch — not evaluated");
        continue;
      }
      skip("unrecognized % directive");
      continue;
    }
    if (ifDepth > 0) {
      skip("inside a %if conditional block — not evaluated");
      continue;
    }

    const { segments } = tokenizeLine(line.text);
    const words = segments[0] ?? [];
    if (words.length === 0) {
      annotated.kind = "blank";
      counts.blankOrComment++;
      continue;
    }

    const rawName = words[0].value;
    const name = expandAlias(rawName);

    switch (name) {
      case "bind-key": {
        handleBind(words.slice(1), segments);
        continue;
      }
      case "unbind-key": {
        handleUnbind(words.slice(1));
        continue;
      }
      case "set-option":
      case "set-window-option": {
        handleSet(words.slice(1));
        continue;
      }
      case "set-environment": {
        const { rest } = takeFlags(words.slice(1), new Set(["t"]));
        const varName = rest[0]?.value ?? "";
        const value = rest[1]?.value ?? null;
        environment.push({ name: varName, value, lineNo: line.lineNo });
        annotated.kind = "recognized";
        annotated.explanation.push(
          `sets environment variable ${varName}` +
            (SECRETISH.test(varName) ? " (value looks sensitive)" : ""),
        );
        counts.recognized++;
        continue;
      }
      case "source-file": {
        const { rest } = takeFlags(words.slice(1), new Set(["t"]));
        const paths = rest.map((t) => t.value);
        sourcesFiles.push(...paths);
        annotated.kind = "annotation";
        annotated.explanation.push(
          `sources ${paths.join(", ") || "another file"} — paste that file too for full coverage`,
        );
        counts.parsed++;
        continue;
      }
      case "if-shell": {
        hasConditionals = true;
        if (/reattach-to-user-namespace/.test(line.text)) {
          annotated.kind = "recognized";
          annotated.explanation.push(
            "conditional reattach-to-user-namespace setup",
          );
          warn(
            "reattach-to-user-namespace has been unnecessary since tmux 2.6 (2017)",
            "stale-1",
            STALE_LINKS.reattach,
          );
          counts.recognized++;
          continue;
        }
        skip("if-shell conditional — not evaluated");
        continue;
      }
      case "set-hook": {
        skip("hook (set-hook) — not interpreted");
        continue;
      }
      case "display-menu":
      case "display-popup": {
        skip(`${name} body — not interpreted`);
        continue;
      }
      case "run-shell": {
        if (/reattach-to-user-namespace/.test(line.text)) {
          annotated.kind = "recognized";
          annotated.explanation.push("runs reattach-to-user-namespace");
          warn(
            "reattach-to-user-namespace has been unnecessary since tmux 2.6 (2017)",
            "stale-1",
            STALE_LINKS.reattach,
          );
          counts.recognized++;
          continue;
        }
        if (/\btpm\b|plugins/.test(line.text)) {
          annotated.kind = "recognized";
          annotated.explanation.push("runs a plugin script — plugin settings");
          counts.recognized++;
          continue;
        }
        skip("run-shell — external command, not interpreted");
        continue;
      }
      default: {
        if (KNOWN_COMMANDS.has(name)) {
          skip(`${name} — valid tmux command, not interpreted by this site`);
        } else {
          skip("unrecognized line");
        }
        continue;
      }
    }

    // ── bind / unbind / set handlers (closures over this line) ──────────

    function handleBind(args: Token[], chainSegments: Token[][]): void {
      const { flags, rest } = takeFlags(args, new Set(["T", "N", "t"]));

      // Legacy pre-2.4 tables (stale rule 3) — recognized, not interpreted.
      if (flags.has("t")) {
        const table = flags.get("t") ?? "";
        annotated.kind = "recognized";
        annotated.explanation.push(
          `legacy ${table} table binding (pre-tmux-2.4 syntax) — not interpreted`,
        );
        warn(
          `\`bind -t ${table}\` is pre-2.4 syntax and silently dead on modern tmux — use \`bind -T copy-mode-vi ... send -X ...\``,
          "stale-3",
          STALE_LINKS.copyPaste,
        );
        counts.recognized++;
        return;
      }

      const table = flags.has("n") ? "root" : (flags.get("T") ?? "prefix");
      const repeatable = flags.has("r");
      const note = flags.get("N") ?? undefined;

      if (rest.length === 0) {
        skip("bind-key without a key — unrecognized");
        return;
      }
      const key = canonicalKey(rest[0].value);
      const commandTokens = rest.slice(1);

      if (!BINDING_TABLES.has(table)) {
        skip(
          `binding in the \`${table}\` key table — not rendered by this site`,
        );
        return;
      }

      const braceBlock = commandTokens.length > 0 && commandTokens[0].brace;
      const chained = chainSegments.length > 1;
      const first = joinTokens(commandTokens);
      const parsedName = braceBlock
        ? null
        : commandTokens.length > 0
          ? expandAlias(commandTokens[0].value)
          : null;

      const binding: ParsedBinding = {
        table,
        key,
        command: first,
        commandName: parsedName,
        note,
        repeatable,
        chained,
        chainedCount: chainSegments.length - 1,
        braceBlock,
        lineNo: line.lineNo,
      };
      events.push({ type: "bind", binding });

      annotated.kind = "binding";
      const tableLabel =
        table === "root"
          ? "no prefix needed"
          : table === "prefix"
            ? "after the prefix"
            : `in ${table}`;
      annotated.explanation.push(
        braceBlock
          ? `binds ${key} (${tableLabel}) to a command block (not interpreted)`
          : `binds ${key} (${tableLabel}) to \`${first}\``,
      );
      if (repeatable) annotated.explanation.push("repeatable (-r)");
      if (note) annotated.explanation.push(`note: ${note}`);
      if (chained) {
        annotated.explanation.push(`+${binding.chainedCount} chained command${binding.chainedCount === 1 ? "" : "s"}`);
        // Reload idiom: source-file ... \; display ...
        if (
          parsedName === "source-file" &&
          chainSegments
            .slice(1)
            .some((seg) => expandAlias(seg[0]?.value ?? "") === "display-message")
        ) {
          annotated.explanation.push("also displays a message");
        }
      }
      counts.parsed++;
    }

    function handleUnbind(args: Token[]): void {
      const { flags, rest } = takeFlags(args, new Set(["T", "t"]));
      if (flags.has("t")) {
        annotated.kind = "recognized";
        annotated.explanation.push(
          "legacy table unbind (pre-tmux-2.4 syntax) — not interpreted",
        );
        warn(
          "`unbind -t` is pre-2.4 syntax and silently dead on modern tmux",
          "stale-3",
          STALE_LINKS.copyPaste,
        );
        counts.recognized++;
        return;
      }
      const table = flags.has("n") ? "root" : (flags.get("T") ?? "prefix");
      if (flags.has("a")) {
        events.push({ type: "unbind-all", table, lineNo: line.lineNo });
        annotated.kind = "unbind";
        annotated.explanation.push(
          `removes every default binding in the ${table} table`,
        );
        warn(
          `this config unbinds all defaults in the \`${table}\` table — defaults are shown as a collapsed "unbound" group`,
          "unbind-all",
        );
        counts.parsed++;
        return;
      }
      if (rest.length === 0) {
        skip("unbind without a key — unrecognized");
        return;
      }
      if (!BINDING_TABLES.has(table)) {
        skip(`unbind in the \`${table}\` key table — not rendered by this site`);
        return;
      }
      const key = canonicalKey(rest[0].value);
      events.push({ type: "unbind", table, key, lineNo: line.lineNo });
      annotated.kind = "unbind";
      annotated.explanation.push(
        `unbinds ${key}${table === "prefix" ? "" : ` in the ${table} table`}`,
      );
      counts.parsed++;
    }

    function handleSet(args: Token[]): void {
      const { flags, rest } = takeFlags(args, new Set(["t"]));
      const optName = rest[0]?.value ?? "";
      const value = rest.length > 1 ? joinValue(rest.slice(1)) : null;
      const appended = flags.has("a");
      const unset = flags.has("u");
      const flagList = [...flags.keys()];

      if (optName === "") {
        skip("set without an option name — unrecognized");
        return;
      }

      // @-options / plugins.
      if (optName.startsWith("@")) {
        annotated.kind = "recognized";
        if (optName === "@plugin" && value !== null) {
          plugins.push(value);
          annotated.explanation.push(`plugin: ${value} — plugin settings`);
        } else {
          annotated.explanation.push(
            `plugin option ${optName}${value !== null ? ` = ${value}` : ""} — plugin settings`,
          );
        }
        counts.recognized++;
        return;
      }

      // Pre-2.1 mouse options (stale rule 4).
      if (LEGACY_MOUSE_OPTIONS.has(optName)) {
        annotated.kind = "recognized";
        annotated.explanation.push(
          `${optName} — removed in tmux 2.1, not interpreted`,
        );
        warn(
          `\`${optName}\` was removed in tmux 2.1 — it's just \`set -g mouse on\` now`,
          "stale-4",
          STALE_LINKS.mouse,
        );
        counts.recognized++;
        return;
      }

      // terminal-overrides / terminal-features (stale rule 5 feed).
      if (optName === "terminal-overrides" || optName === "terminal-features") {
        annotated.kind = "recognized";
        annotated.explanation.push(
          `${optName}${appended ? " (appended)" : ""}: ${value ?? ""} — terminal capabilities (not interpreted)`,
        );
        if (
          optName === "terminal-overrides" &&
          value !== null &&
          /256col/.test(value) &&
          /colors=256/.test(value)
        ) {
          warn(
            "256 indexed colors is not true color — for RGB support use `set -as terminal-features \",*:RGB\"`",
            "stale-5",
            STALE_LINKS.colors,
          );
        }
        counts.recognized++;
        return;
      }

      // Status styling (echoed, not interpreted).
      if (STYLING_OPTIONS.has(optName)) {
        annotated.kind = "recognized";
        annotated.explanation.push(
          `${optName} — status styling (not interpreted)`,
        );
        counts.recognized++;
        return;
      }

      // default-command with reattach-to-user-namespace (stale rule 1).
      if (
        optName === "default-command" &&
        value !== null &&
        /reattach-to-user-namespace/.test(value)
      ) {
        annotated.kind = "recognized";
        annotated.explanation.push(
          "default-command via reattach-to-user-namespace",
        );
        warn(
          "reattach-to-user-namespace has been unnecessary since tmux 2.6 (2017)",
          "stale-1",
          STALE_LINKS.reattach,
        );
        counts.recognized++;
        return;
      }

      const renderOption = RENDER_OPTIONS.has(optName);
      const annotationOption = optName in ANNOTATION_OPTIONS;

      if (!renderOption && !annotationOption && optName !== "prefix2") {
        annotated.kind = "recognized";
        annotated.explanation.push(
          `sets \`${optName}\`${value !== null ? ` to \`${value}\`` : ""} (not interpreted)`,
        );
        counts.recognized++;
        return;
      }

      const option: ParsedOption = {
        name: optName,
        value,
        flags: flagList,
        appended,
        unset,
        lineNo: line.lineNo,
      };

      if (unset) {
        events.push({ type: "unset-option", name: optName, lineNo: line.lineNo });
        annotated.kind = "option";
        annotated.explanation.push(
          `resets \`${optName}\` to its default (-u)`,
        );
        counts.parsed++;
        return;
      }

      if (optName === "prefix2") {
        annotated.kind = "recognized";
        annotated.explanation.push(
          `secondary prefix ${value !== null ? canonicalKey(value) : ""} — listed under other settings (not rendered)`,
        );
        counts.recognized++;
        return;
      }

      if (optName === "prefix" && value !== null) {
        option.value = canonicalKey(value);
      }

      events.push({ type: "set-option", option });
      annotated.kind = "option";

      if (appended) {
        annotated.explanation.push(
          `appends to \`${optName}\`: ${value ?? ""} — appended (not merged)`,
        );
      } else if (optName === "prefix") {
        annotated.explanation.push(`sets the prefix to ${option.value}`);
      } else if (annotationOption) {
        annotated.explanation.push(
          `${optName}${value !== null ? ` = ${value}` : ""} — ${ANNOTATION_OPTIONS[optName]}`,
        );
      } else {
        annotated.explanation.push(
          `${optName}${value !== null ? ` = ${value}` : ""}`,
        );
      }

      if (optName === "mode-keys" && value === "emacs") {
        warn(
          "your copy mode is emacs; the copy-mode section shows vi defaults",
          "mode-keys-emacs",
        );
      }
      if (
        optName === "default-terminal" &&
        value !== null &&
        /^screen(-256color)?$/.test(value)
      ) {
        warn(
          `\`${value}\` is outdated as default-terminal — use \`tmux-256color\` (italics + modern features)`,
          "stale-2",
          STALE_LINKS.colors,
        );
      }
      if (optName === "history-limit" && value !== null) {
        const n = parseInt(value, 10);
        if (!Number.isNaN(n) && n >= 500000) {
          warn(
            `history-limit ${value} reserves that many lines of RAM per pane — consider \`pipe-pane\` logging instead`,
            "stale-6",
            STALE_LINKS.historyLimit,
          );
        }
      }
      counts.parsed++;
    }

    function joinValue(tokens: Token[]): string {
      return tokens.map((t) => t.value).join(" ");
    }
  }

  // ── Resolve the event stream (source order == last wins) ──────────────

  const bindings = new Map<string, ParsedBinding>();
  const unbinds = new Set<string>();
  const unbindAllTables = new Set<string>();
  const options = new Map<string, ParsedOption>();

  for (const ev of events) {
    switch (ev.type) {
      case "bind": {
        const k = `${ev.binding.table} ${ev.binding.key}`;
        bindings.set(k, ev.binding);
        unbinds.delete(k);
        break;
      }
      case "unbind": {
        const k = `${ev.table} ${ev.key}`;
        bindings.delete(k);
        unbinds.add(k);
        break;
      }
      case "unbind-all": {
        unbindAllTables.add(ev.table);
        for (const k of [...bindings.keys()]) {
          if (k.startsWith(`${ev.table} `)) bindings.delete(k);
        }
        for (const k of [...unbinds]) {
          if (k.startsWith(`${ev.table} `)) unbinds.delete(k);
        }
        break;
      }
      case "set-option":
        options.set(ev.option.name, ev.option);
        break;
      case "unset-option":
        options.delete(ev.name);
        break;
    }
  }

  const prefix = options.get("prefix")?.value ?? "C-b";

  return {
    prefix,
    bindings,
    unbinds,
    unbindAllTables,
    options,
    plugins,
    environment,
    sourcesFiles,
    hasConditionals,
    warnings,
    skipped,
    lines,
    counts,
  };
}
