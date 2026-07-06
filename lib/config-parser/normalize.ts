/**
 * Command and key normalization — the load-bearing half of config awareness.
 *
 * Canonicalizes keys to `tmux list-keys` notation, expands command aliases,
 * strips the copy-mode `send-keys -X <action>` wrapper, parses command flags
 * per the specs derived from `list-commands`, and implements the dataset
 * flag-subset matching rule from the parser contract.
 *
 * Browser-safe: no platform APIs.
 */

import { COMMAND_ALIASES, COMMAND_FLAG_SPECS, KNOWN_COMMANDS } from "./aliases";
import { tokenizeLine, type Token } from "./tokenize";

// ── Key canonicalization ────────────────────────────────────────────────

/** Named-key spellings -> list-keys notation (case-insensitive lookup). */
const NAMED_KEYS: Record<string, string> = {
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
  ppage: "PPage",
  pageup: "PPage",
  pgup: "PPage",
  npage: "NPage",
  pagedown: "NPage",
  pgdn: "NPage",
  space: "Space",
  enter: "Enter",
  return: "Enter",
  escape: "Escape",
  esc: "Escape",
  tab: "Tab",
  btab: "BTab",
  bspace: "BSpace",
  backspace: "BSpace",
  home: "Home",
  end: "End",
  ic: "IC",
  insert: "IC",
  dc: "DC",
  delete: "DC",
};
for (let f = 1; f <= 12; f++) NAMED_KEYS[`f${f}`] = `F${f}`;

/**
 * Canonicalize a key to `tmux list-keys` notation.
 *
 * `^B` -> `C-b`, `M-`/`Meta-` unified to `M-`, quotes removed, named keys
 * normalized (Up, PPage, Space, ...), ctrl-letter lowercased (tmux treats
 * C-B == C-b), other case preserved. Modifier order is C, M, S.
 */
export function canonicalKey(raw: string): string {
  let key = raw.trim();
  // Strip one layer of surrounding quotes ('v' or "v").
  if (
    key.length >= 2 &&
    ((key[0] === "'" && key[key.length - 1] === "'") ||
      (key[0] === '"' && key[key.length - 1] === '"'))
  ) {
    key = key.slice(1, -1);
  }
  if (key === "") return key;

  let ctrl = false;
  let meta = false;
  let shift = false;
  for (;;) {
    if (key.length > 1 && key[0] === "^") {
      ctrl = true;
      key = key.slice(1);
    } else if (/^C-/i.test(key) && key.length > 2) {
      ctrl = true;
      key = key.slice(2);
    } else if (/^Meta-/i.test(key) && key.length > 5) {
      meta = true;
      key = key.slice(5);
    } else if (/^M-/i.test(key) && key.length > 2) {
      meta = true;
      key = key.slice(2);
    } else if (/^S-/i.test(key) && key.length > 2) {
      shift = true;
      key = key.slice(2);
    } else {
      break;
    }
  }

  const named = NAMED_KEYS[key.toLowerCase()];
  if (named) key = named;
  else if (ctrl && /^[A-Z]$/.test(key)) key = key.toLowerCase();

  return (ctrl ? "C-" : "") + (meta ? "M-" : "") + (shift ? "S-" : "") + key;
}

// ── Command parsing ─────────────────────────────────────────────────────

/** A tmux command parsed into name + flags + positional arguments. */
export interface ParsedCommand {
  /** Canonical command name after alias expansion. */
  name: string;
  /** True if `name` is a known tmux 3.6b command. */
  known: boolean;
  /**
   * True if this was a copy-mode `send-keys -X <action>` wrapper: `name` is
   * then the bare action and `actionArgs` holds the dropped arguments.
   */
  copyModeAction: boolean;
  /** Arguments after a copy-mode action (kept for annotation only). */
  actionArgs: string[];
  /** flag letter -> value (null for boolean flags). Last occurrence wins. */
  flags: Map<string, string | null>;
  /** Positional (non-flag) arguments. */
  positionals: string[];
}

/** Expand a command alias to its canonical name (identity if unknown). */
export function expandAlias(name: string): string {
  return COMMAND_ALIASES[name] ?? name;
}

/** Parse pre-tokenized command words. */
export function parseCommandTokens(tokens: Token[]): ParsedCommand | null {
  if (tokens.length === 0) return null;
  const name = expandAlias(tokens[0].value);
  const known = KNOWN_COMMANDS.has(name);
  const spec = COMMAND_FLAG_SPECS[name] ?? {};
  const flags = new Map<string, string | null>();
  const positionals: string[] = [];

  let i = 1;
  let flagsDone = false;
  while (i < tokens.length) {
    const t = tokens[i];
    const v = t.value;
    if (v === "--") {
      flagsDone = true;
      i++;
      continue;
    }
    if (!flagsDone && !t.quoted && !t.brace && /^-[A-Za-z0-9]/.test(v)) {
      // Flag cluster, possibly with an attached value (-Tcopy-mode).
      let j = 1;
      while (j < v.length) {
        const ch = v[j];
        const valued = spec[ch] ?? false;
        if (valued) {
          const attached = v.slice(j + 1);
          if (attached.length > 0) {
            flags.set(ch, attached);
          } else if (i + 1 < tokens.length) {
            i++;
            flags.set(ch, tokens[i].value);
          } else {
            flags.set(ch, null);
          }
          j = v.length;
        } else {
          flags.set(ch, null);
          j++;
        }
      }
      i++;
      continue;
    }
    flagsDone = true;
    positionals.push(t.brace ? v : v);
    i++;
  }

  // Copy-mode wrapper: send-keys -X <action> [args...] -> bare action.
  if (name === "send-keys" && flags.has("X") && positionals.length > 0) {
    return {
      name: positionals[0],
      known: false,
      copyModeAction: true,
      actionArgs: positionals.slice(1),
      flags: new Map(),
      positionals: [],
    };
  }

  return { name, known, copyModeAction: false, actionArgs: [], flags, positionals };
}

/** Parse a command string (tokenizes first; chains take the first segment). */
export function parseCommandString(command: string): ParsedCommand | null {
  const { segments } = tokenizeLine(command);
  return parseCommandTokens(segments[0] ?? []);
}

// ── Dataset flag matching ───────────────────────────────────────────────

/** Human annotations for extra flags the dataset entry doesn't have. */
function annotateExtraFlag(
  cmd: string,
  flag: string,
  value: string | null,
): string {
  if (value !== null && /pane_current_path/.test(value)) {
    return "+ opens in current directory";
  }
  if (flag === "l" && value !== null) return `+ sized ${value}`;
  if (flag === "b" && (cmd === "split-window" || cmd === "join-pane")) {
    return "+ places the new pane before the current one";
  }
  if (flag === "f" && cmd === "split-window") return "+ spans the full window";
  if (flag === "d") return "+ without switching to it";
  return value === null ? `+ flag -${flag}` : `+ -${flag} ${value}`;
}

/** Result of matching a user command against a dataset command. */
export interface MatchResult {
  match: boolean;
  /** Human-readable notes for extra user flags/args beyond the dataset's. */
  annotations: string[];
}

const NO_MATCH: MatchResult = { match: false, annotations: [] };

/**
 * Contract rule: a user command matches a dataset command when names are
 * equal after alias expansion AND the dataset flag set is a subset of the
 * user flag set. Flag identity = name + argument for valued flags; extra
 * user flags are annotated, not disqualifying. Dataset positionals must be
 * matched by the user's positionals.
 */
export function matchesDataset(
  userCmd: string | ParsedCommand,
  datasetCmd: string,
): MatchResult {
  const user =
    typeof userCmd === "string" ? parseCommandString(userCmd) : userCmd;
  const dataset = parseCommandString(datasetCmd);
  if (!user || !dataset) return NO_MATCH;
  if (user.name !== dataset.name) return NO_MATCH;
  if (user.copyModeAction !== dataset.copyModeAction && dataset.known) {
    return NO_MATCH;
  }

  const annotations: string[] = [];

  // Dataset flags must all be present on the user side (name + value).
  for (const [flag, value] of dataset.flags) {
    if (!user.flags.has(flag)) return NO_MATCH;
    const userValue = user.flags.get(flag) ?? null;
    if (value !== null && userValue !== value) return NO_MATCH;
  }
  // Extra user flags -> annotations.
  for (const [flag, value] of user.flags) {
    if (!dataset.flags.has(flag)) {
      annotations.push(annotateExtraFlag(user.name, flag, value));
    }
  }

  // Dataset positionals must be a prefix of user positionals.
  for (let i = 0; i < dataset.positionals.length; i++) {
    if (user.positionals[i] !== dataset.positionals[i]) return NO_MATCH;
  }
  for (let i = dataset.positionals.length; i < user.positionals.length; i++) {
    annotations.push(`+ argument ${user.positionals[i]}`);
  }
  if (user.copyModeAction && user.actionArgs.length > 0) {
    annotations.push(`+ ${user.actionArgs.join(" ")}`);
  }

  return { match: true, annotations };
}
