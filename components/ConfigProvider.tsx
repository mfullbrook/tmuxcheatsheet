"use client";

/**
 * ConfigProvider — owns the user's parsed tmux config (T1: its own context,
 * separate from KeyboardProvider; nested inside it in app/layout.tsx).
 *
 * Responsibilities:
 * - applyConfig(source): parse + store the PARSED result (raw source is the
 *   explain page's business, in sessionStorage — see storage.ts).
 * - Persistence under `tmuxlab:config:v1`, all storage access in try/catch
 *   (T2); on failure the session still personalizes and `persistFailed` flips.
 * - Migration of the legacy `tmux-prefix` key into a prefix-only config.
 * - Effective-prefix write-through: KeyboardProvider keeps display state
 *   only; this provider pushes the effective prefix up via its setPrefix
 *   (config prefix when active and not showing defaults, else "C-b"), which
 *   also drives the site's prefix-key arming (T12).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  InputTooLargeError,
  MAX_INPUT_BYTES,
  NoContentError,
  parseConfig,
} from "@/lib/config-parser/parse";
import { buildOverlay, type OverlayModel } from "@/lib/config-parser/overlay";
import {
  CONFIG_STORAGE_KEY,
  deserializeConfig,
  LEGACY_PREFIX_KEY,
  prefixOnlyConfig,
  serializeConfig,
  SHOW_DEFAULTS_STORAGE_KEY,
  type StoredConfig,
} from "@/lib/config-parser/storage";
import { useTmuxSite } from "./KeyboardProvider";

const DEFAULT_PREFIX = "C-b";

export interface ApplyConfigResult {
  ok: boolean;
  /** Status-bar-ready message describing what happened. */
  message: string;
  parsed?: StoredConfig;
}

export interface ConfigContextValue {
  status: "none" | "active";
  parsed: StoredConfig | null;
  /** Memoized overlay model; null when no config is active. */
  overlay: OverlayModel | null;
  /** UI toggle: show stock defaults instead of the user's keys. */
  showDefaults: boolean;
  /** True when localStorage failed — personalization is session-only. */
  persistFailed: boolean;
  applyConfig: (source: string) => ApplyConfigResult;
  clearConfig: () => void;
  setShowDefaults: (v: boolean) => void;
  /** Write-through prefix: updates the stored config AND the displayed prefix. */
  setPrefix: (p: string) => void;
}

const Ctx = createContext<ConfigContextValue | null>(null);

export function useConfig(): ConfigContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConfig outside ConfigProvider");
  return ctx;
}

/**
 * Like useConfig, but returns null outside ConfigProvider — for components
 * (e.g. the palette, mounted by KeyboardProvider) that render above it.
 */
export function useOptionalConfig(): ConfigContextValue | null {
  return useContext(Ctx);
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const { setPrefix: setDisplayPrefix } = useTmuxSite();
  const [parsed, setParsed] = useState<StoredConfig | null>(null);
  const [showDefaults, setShowDefaultsState] = useState(false);
  const [persistFailed, setPersistFailed] = useState(false);
  const hydrated = useRef(false);

  const persist = useCallback((config: StoredConfig | null) => {
    try {
      if (config === null) {
        localStorage.removeItem(CONFIG_STORAGE_KEY);
      } else {
        localStorage.setItem(
          CONFIG_STORAGE_KEY,
          JSON.stringify(serializeConfig(config)),
        );
      }
    } catch {
      setPersistFailed(true);
    }
  }, []);

  // Restore after hydration (SSR renders defaults; same rAF pattern as
  // KeyboardProvider). Also migrates the legacy `tmux-prefix` key.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      hydrated.current = true;
      try {
        const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (stored !== null) {
          const config = deserializeConfig(stored);
          if (config) setParsed(config);
        } else {
          // Migration: legacy prefix-only key → minimal v1 config.
          const legacy = localStorage.getItem(LEGACY_PREFIX_KEY);
          if (legacy) {
            setParsed(prefixOnlyConfig(legacy));
            localStorage.removeItem(LEGACY_PREFIX_KEY);
          }
        }
        if (localStorage.getItem(SHOW_DEFAULTS_STORAGE_KEY) === "1") {
          setShowDefaultsState(true);
        }
      } catch {
        setPersistFailed(true);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Persist whenever the parsed config changes (after hydration restore).
  useEffect(() => {
    if (!hydrated.current) return;
    persist(parsed);
  }, [parsed, persist]);

  // Effective-prefix rule: the site shows the config prefix while a config
  // is active and defaults are not toggled on. Pushing it through
  // KeyboardProvider.setPrefix also re-arms prefix navigation (T12).
  const effectivePrefix =
    parsed !== null && !showDefaults ? parsed.prefix : DEFAULT_PREFIX;
  useEffect(() => {
    setDisplayPrefix(effectivePrefix);
  }, [effectivePrefix, setDisplayPrefix]);

  const applyConfig = useCallback(
    (source: string): ApplyConfigResult => {
      if (source.trim() === "") {
        return {
          ok: false,
          message: "nothing to parse — paste your .tmux.conf first",
        };
      }
      if (source.length > MAX_INPUT_BYTES) {
        return {
          ok: false,
          message: "config too large (over 256KB) — is that really a tmux.conf?",
        };
      }
      let result: StoredConfig;
      try {
        result = parseConfig(source);
      } catch (err) {
        // Defensive: parseConfig re-checks the guards above.
        if (err instanceof NoContentError || err instanceof InputTooLargeError) {
          return { ok: false, message: err.message };
        }
        return { ok: false, message: "could not parse this config" };
      }
      // Pasting a config REPLACES the whole config state.
      setParsed(result);
      return {
        ok: true,
        message: `config applied — ${result.counts.parsed} lines parsed`,
        parsed: result,
      };
    },
    [],
  );

  const clearConfig = useCallback(() => {
    setParsed(null); // persist effect removes the v1 key
    try {
      localStorage.removeItem(LEGACY_PREFIX_KEY);
    } catch {
      setPersistFailed(true);
    }
  }, []);

  const setShowDefaults = useCallback((v: boolean) => {
    setShowDefaultsState(v);
    try {
      localStorage.setItem(SHOW_DEFAULTS_STORAGE_KEY, v ? "1" : "0");
    } catch {
      setPersistFailed(true);
    }
  }, []);

  const setPrefix = useCallback((p: string) => {
    setParsed((prev) =>
      prev ? { ...prev, prefix: p } : prefixOnlyConfig(p),
    );
  }, []);

  const overlay = useMemo(
    () => (parsed ? buildOverlay(parsed) : null),
    [parsed],
  );

  const value = useMemo<ConfigContextValue>(
    () => ({
      status: parsed ? "active" : "none",
      parsed,
      overlay,
      showDefaults,
      persistFailed,
      applyConfig,
      clearConfig,
      setShowDefaults,
      setPrefix,
    }),
    [
      parsed,
      overlay,
      showDefaults,
      persistFailed,
      applyConfig,
      clearConfig,
      setShowDefaults,
      setPrefix,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
