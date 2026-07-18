/**
 * Secret masking (T4) — render-time only.
 *
 * Detects secret-shaped values in raw config lines and returns a masked
 * rendering. The stored/parsed data is never touched: callers mask at
 * render/copy/report time and may offer a per-line reveal toggle.
 *
 * Rules:
 * 1. `setenv` / `set-environment` values whose variable name matches the
 *    secret-name pattern.
 * 2. Any `NAME=VALUE` assignment token whose NAME matches the pattern.
 * 3. tmux option assignments (`set`/`set-option`/`setw`/plugin `@options`)
 *    whose option name matches the pattern — excluding known-safe tmux
 *    option names like `mode-keys` that merely contain "key".
 * 4. Long high-entropy strings (token/credential shapes).
 *
 * Browser-safe: no platform APIs.
 */

export const MASK = "••••••••";

/** Secret-shaped names (per T4 contract). */
export const SECRET_NAME_RE = /(TOKEN|KEY|SECRET|PASSWORD|PASSWD|API)/i;

/** tmux option names that match SECRET_NAME_RE but are not secrets. */
const SAFE_OPTION_NAMES = new Set([
  "mode-keys",
  "status-keys",
  "prefix",
  "prefix2",
  "key-table",
  "repeat-time",
  "assume-paste-time",
  "@plugin",
]);

const SET_COMMANDS = new Set([
  "set",
  "set-option",
  "setw",
  "set-window-option",
]);
const SETENV_COMMANDS = new Set(["setenv", "set-environment"]);

function isSecretName(name: string): boolean {
  return SECRET_NAME_RE.test(name) && !SAFE_OPTION_NAMES.has(name);
}

/**
 * True for strings shaped like credentials: long, no whitespace, mixed
 * letters+digits over a token-ish charset, reasonably non-repetitive, and
 * not a tmux format string or filesystem path.
 */
export function looksHighEntropy(token: string): boolean {
  const t = stripQuotes(token);
  if (t.length < 20) return false;
  if (!/^[A-Za-z0-9+/=_.-]+$/.test(t)) return false;
  if (!/[A-Za-z]/.test(t) || !/[0-9]/.test(t)) return false;
  // Paths and plugin specs, not credentials.
  if (t.startsWith("/") || t.startsWith("~") || t.startsWith("./")) return false;
  // Words joined by separators (e.g. plugin names, $TERM values) — require
  // that the bulk of the string is one unbroken alphanumeric run.
  const longestRun = Math.max(
    0,
    ...(t.match(/[A-Za-z0-9]+/g) ?? []).map((r) => r.length),
  );
  if (longestRun < 16) return false;
  // Repetitive strings are not secrets.
  const unique = new Set(t.split("")).size;
  if (unique / t.length < 0.3) return false;
  return true;
}

interface RawToken {
  value: string;
  start: number;
  end: number;
}

/** Split a raw line into whitespace-separated tokens, keeping quotes intact. */
function rawTokens(line: string): RawToken[] {
  const tokens: RawToken[] = [];
  const re = /"(?:[^"\\]|\\.)*"|'[^']*'|\S+/g;
  for (const m of line.matchAll(re)) {
    tokens.push({ value: m[0], start: m.index, end: m.index + m[0].length });
  }
  return tokens;
}

function stripQuotes(v: string): string {
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
  ) {
    return v.slice(1, -1);
  }
  return v;
}

export interface MaskResult {
  /** The line with secret values replaced by MASK. */
  masked: string;
  /** True if anything was masked (drives the per-line reveal toggle). */
  hasSecret: boolean;
}

/**
 * Mask secret-shaped values in one raw config line.
 * Pure string→string; never mutates parsed data.
 */
export function maskSecrets(raw: string): MaskResult {
  const tokens = rawTokens(raw);
  if (tokens.length === 0) return { masked: raw, hasSecret: false };

  // Spans (start, end) to replace with MASK.
  const spans: Array<[number, number]> = [];
  const mask = (t: RawToken) => spans.push([t.start, t.end]);

  const words = tokens.map((t) => stripQuotes(t.value));
  const cmd = words[0];

  // Skip leading flags to find the name argument of set/setenv commands.
  const firstArgIndex = (from: number): number => {
    let i = from;
    while (i < tokens.length && /^-[A-Za-z]/.test(words[i])) i++;
    return i;
  };

  if (SETENV_COMMANDS.has(cmd)) {
    const ni = firstArgIndex(1);
    if (ni < tokens.length && isSecretName(words[ni])) {
      for (let i = ni + 1; i < tokens.length; i++) mask(tokens[i]);
    }
  } else if (SET_COMMANDS.has(cmd)) {
    const ni = firstArgIndex(1);
    if (ni < tokens.length && isSecretName(words[ni])) {
      for (let i = ni + 1; i < tokens.length; i++) mask(tokens[i]);
    }
  }

  for (let i = 0; i < tokens.length; i++) {
    if (spans.some(([s, e]) => tokens[i].start >= s && tokens[i].end <= e)) {
      continue;
    }
    // NAME=VALUE assignments anywhere on the line.
    const eq = words[i].indexOf("=");
    if (eq > 0) {
      const name = words[i].slice(0, eq);
      const value = words[i].slice(eq + 1);
      if (value.length > 0 && isSecretName(name)) {
        // Mask only the value part of the raw token.
        const valueStart =
          tokens[i].start + tokens[i].value.indexOf("=") + 1;
        spans.push([valueStart, tokens[i].end]);
        continue;
      }
    }
    // High-entropy strings (skip the command word itself). Quoted tokens
    // are scanned word-by-word so secrets inside shell snippets are caught.
    if (i === 0) continue;
    if (looksHighEntropy(words[i])) {
      mask(tokens[i]);
      continue;
    }
    for (const m of tokens[i].value.matchAll(/[^\s"']+/g)) {
      if (looksHighEntropy(m[0])) {
        spans.push([
          tokens[i].start + m.index,
          tokens[i].start + m.index + m[0].length,
        ]);
      }
    }
  }

  if (spans.length === 0) return { masked: raw, hasSecret: false };

  spans.sort((a, b) => a[0] - b[0]);
  let out = "";
  let pos = 0;
  for (const [s, e] of spans) {
    if (s < pos) continue; // overlapping span already covered
    out += raw.slice(pos, s) + MASK;
    pos = e;
  }
  out += raw.slice(pos);
  return { masked: out, hasSecret: true };
}

/** Mask a whole config for copy/report paths (every line, no reveal). */
export function maskConfigText(source: string): string {
  return source
    .split("\n")
    .map((l) => maskSecrets(l).masked)
    .join("\n");
}
