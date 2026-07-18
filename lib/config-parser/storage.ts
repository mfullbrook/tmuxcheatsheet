/**
 * Persistence for the parsed-config overlay (T7).
 *
 * Only the PARSED result is persisted to localStorage, under a versioned
 * key. Fields whose contents echo the raw source (per-line records, skipped
 * lines, warnings, environment assignments) are deliberately NOT persisted —
 * raw source belongs in sessionStorage on the explain page, and persisting
 * it is an explicit "remember my config" opt-in (see `rememberSource`).
 *
 * Pure serialization logic lives here so it can be unit-tested; all actual
 * storage access happens in ConfigProvider, wrapped in try/catch (T2).
 */

import type {
  ParseCounts,
  ParsedBinding,
  ParsedOption,
  ParseResult,
} from "./parse";

/** The rehydrated config as held by ConfigProvider. */
export type StoredConfig = ParseResult;

/** localStorage key for the persisted parsed config (versioned, T8). */
export const CONFIG_STORAGE_KEY = "tmuxlab:config:v1";

/** localStorage key for the your-keys/defaults UI toggle (own key; never mutates the config). */
export const SHOW_DEFAULTS_STORAGE_KEY = "tmuxlab:show-defaults:v1";

/**
 * sessionStorage key for the RAW config source while on the explain page.
 * Not read or written by ConfigProvider — the explain page owns it. Raw
 * source only reaches localStorage via the "remember my config" opt-in
 * (`rememberSource` below), implemented with the explain page.
 */
export const CONFIG_SOURCE_SESSION_KEY = "tmuxlab:config:source";

/** Pre-v1 key that stored just the prefix; migrated then removed. */
export const LEGACY_PREFIX_KEY = "tmux-prefix";

export const SCHEMA_VERSION = 1;

/** JSON shape written to localStorage. Maps/Sets are serialized as arrays. */
export interface StoredConfigV1 {
  schemaVersion: 1;
  /** Opt-in slot: whether the user asked to persist raw source (explain page). */
  rememberSource: boolean;
  prefix: string;
  bindings: Array<[string, ParsedBinding]>;
  unbinds: string[];
  unbindAllTables: string[];
  options: Array<[string, ParsedOption]>;
  plugins: string[];
  sourcesFiles: string[];
  hasConditionals: boolean;
  counts: ParseCounts;
}

/** Serialize a parse result to the versioned JSON shape. */
export function serializeConfig(
  parsed: ParseResult,
  opts: { rememberSource?: boolean } = {},
): StoredConfigV1 {
  return {
    schemaVersion: SCHEMA_VERSION,
    rememberSource: opts.rememberSource ?? false,
    prefix: parsed.prefix,
    bindings: [...parsed.bindings.entries()],
    unbinds: [...parsed.unbinds],
    unbindAllTables: [...parsed.unbindAllTables],
    options: [...parsed.options.entries()],
    plugins: [...parsed.plugins],
    sourcesFiles: [...parsed.sourcesFiles],
    hasConditionals: parsed.hasConditionals,
    counts: { ...parsed.counts },
  };
}

/**
 * Deserialize a stored JSON string back into a StoredConfig.
 * Returns null for malformed JSON or a schemaVersion we don't understand.
 * Line-level fields (lines, skipped, warnings, environment) come back empty —
 * they are never persisted.
 */
export function deserializeConfig(json: string): StoredConfig | null {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const d = data as Partial<StoredConfigV1>;
  if (d.schemaVersion !== SCHEMA_VERSION) return null;
  if (typeof d.prefix !== "string" || !Array.isArray(d.bindings)) return null;
  return {
    prefix: d.prefix,
    bindings: new Map(d.bindings),
    unbinds: new Set(d.unbinds ?? []),
    unbindAllTables: new Set(d.unbindAllTables ?? []),
    options: new Map(d.options ?? []),
    plugins: d.plugins ?? [],
    environment: [],
    sourcesFiles: d.sourcesFiles ?? [],
    hasConditionals: d.hasConditionals ?? false,
    warnings: [],
    skipped: [],
    lines: [],
    counts:
      d.counts ??
      ({ total: 0, parsed: 0, recognized: 0, skipped: 0, blankOrComment: 0 } satisfies ParseCounts),
  };
}

/**
 * A minimal prefix-only config, used to migrate the legacy `tmux-prefix`
 * localStorage key into v1 storage on first load.
 */
export function prefixOnlyConfig(prefix: string): StoredConfig {
  return {
    prefix,
    bindings: new Map(),
    unbinds: new Set(),
    unbindAllTables: new Set(),
    options: new Map(),
    plugins: [],
    environment: [],
    sourcesFiles: [],
    hasConditionals: false,
    warnings: [],
    skipped: [],
    lines: [],
    counts: { total: 0, parsed: 0, recognized: 0, skipped: 0, blankOrComment: 0 },
  };
}
