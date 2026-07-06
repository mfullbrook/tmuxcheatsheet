"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { SITE_WINDOWS } from "@/lib/site-nav";
import { CommandPalette } from "./CommandPalette";
import { HelpOverlay } from "./HelpOverlay";

interface TmuxSiteContext {
  /** The user's tmux prefix as displayed across the site, e.g. "C-b". */
  prefix: string;
  setPrefix: (p: string) => void;
  /** True while the site prefix (Ctrl-b) is armed, tmux-style. */
  armed: boolean;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  /** Status-bar message, like tmux display-message. */
  message: string | null;
  showMessage: (text: string) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

const Ctx = createContext<TmuxSiteContext | null>(null);

export function useTmuxSite(): TmuxSiteContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTmuxSite outside KeyboardProvider");
  return ctx;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable ||
    // The tutorial playground owns its own keys, including C-b.
    el.closest("[data-tmux-playground]") !== null
  );
}

/** "Space" ⇄ " ", case-insensitive letter match. */
function keyNameMatches(eventKey: string, name: string): boolean {
  if (name === "Space") return eventKey === " " || eventKey === "Spacebar";
  return eventKey.toLowerCase() === name.toLowerCase();
}

/**
 * Does a keydown event match a canonical tmux prefix string (T12)?
 * Understands "C-x" (ctrl), "M-x" (alt/meta-as-Alt), and bare keys ("`").
 */
function eventMatchesPrefix(e: KeyboardEvent, prefix: string): boolean {
  const mod = /^([CM])-(.+)$/.exec(prefix);
  if (mod) {
    const wantCtrl = mod[1] === "C";
    const wantAlt = mod[1] === "M";
    if (e.ctrlKey !== wantCtrl || e.altKey !== wantAlt || e.metaKey)
      return false;
    return keyNameMatches(e.key, mod[2]);
  }
  return (
    !e.ctrlKey && !e.altKey && !e.metaKey && keyNameMatches(e.key, prefix)
  );
}

export function KeyboardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [prefix, setPrefixState] = useState("C-b");
  const [armed, setArmed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const disarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore persisted settings (async to avoid setState-in-effect churn).
  // The prefix is NOT restored here: ConfigProvider owns prefix storage and
  // writes the effective prefix through setPrefix after hydration.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const storedTheme = localStorage.getItem("theme");
      if (storedTheme === "light") {
        setTheme("light");
        document.documentElement.dataset.theme = "light";
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Display state only — persistence lives in ConfigProvider (storage owner).
  const setPrefix = useCallback((p: string) => {
    setPrefixState(p);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      if (next === "light") document.documentElement.dataset.theme = "light";
      else delete document.documentElement.dataset.theme;
      localStorage.setItem("theme", next);
      return next;
    });
  }, []);

  const showMessage = useCallback((text: string) => {
    setMessage(text);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setMessage(null), 1800);
  }, []);

  const disarm = useCallback(() => {
    setArmed(false);
    if (disarmTimer.current) clearTimeout(disarmTimer.current);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // ⌘K / Ctrl-K always opens the palette.
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (isTypingTarget(e.target)) return;

      // The site prefix: the user's effective prefix (from ConfigProvider's
      // parsed config, via setPrefix), with Ctrl-b always as a fallback so
      // the docs keyboard UX never breaks (T12).
      if (
        eventMatchesPrefix(e, prefix) ||
        (e.ctrlKey && !e.metaKey && !e.altKey && e.key === "b")
      ) {
        e.preventDefault();
        setArmed(true);
        if (disarmTimer.current) clearTimeout(disarmTimer.current);
        disarmTimer.current = setTimeout(() => setArmed(false), 2500);
        return;
      }

      if (armed) {
        // Prefix-table commands, mirroring real tmux where it makes sense.
        const digit = /^[0-9]$/.test(e.key) ? Number(e.key) : null;
        if (digit !== null) {
          const win = SITE_WINDOWS.find((w) => w.index === digit);
          if (win) {
            e.preventDefault();
            router.push(win.href);
            showMessage(`switched to window ${win.index}:${win.name}`);
          }
          disarm();
          return;
        }
        switch (e.key) {
          case "w":
          case "s":
            e.preventDefault();
            setPaletteOpen(true);
            break;
          case "n": {
            e.preventDefault();
            const i = currentWindowIndex();
            const next = SITE_WINDOWS[(i + 1) % SITE_WINDOWS.length];
            router.push(next.href);
            showMessage(`switched to window ${next.index}:${next.name}`);
            break;
          }
          case "p": {
            e.preventDefault();
            const i = currentWindowIndex();
            const prev =
              SITE_WINDOWS[(i - 1 + SITE_WINDOWS.length) % SITE_WINDOWS.length];
            router.push(prev.href);
            showMessage(`switched to window ${prev.index}:${prev.name}`);
            break;
          }
          case "?":
            e.preventDefault();
            setHelpOpen(true);
            break;
          case "/":
            e.preventDefault();
            setPaletteOpen(true);
            break;
          case "d":
            e.preventDefault();
            setPaletteOpen(false);
            setHelpOpen(false);
            showMessage("detached (overlays closed)");
            break;
          case "t":
            e.preventDefault();
            toggleTheme();
            showMessage("toggled theme");
            break;
          case "g":
            e.preventDefault();
            window.scrollTo({ top: 0 });
            break;
          case "G":
            e.preventDefault();
            window.scrollTo({ top: document.body.scrollHeight });
            break;
        }
        disarm();
        return;
      }

      // Bare keys (only when nothing armed and not typing).
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setHelpOpen(true);
      } else if (e.key === "Escape" || e.key === "q") {
        // q closes overlays like tmux copy-mode; harmless otherwise.
        setPaletteOpen(false);
        setHelpOpen(false);
      }
    }

    function currentWindowIndex(): number {
      const path = window.location.pathname;
      let best = 0;
      for (const w of SITE_WINDOWS) {
        if (w.href === "/" ? path === "/" : path.startsWith(w.href)) {
          best = w.index;
        }
      }
      return best;
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [armed, prefix, router, disarm, showMessage, toggleTheme]);

  return (
    <Ctx.Provider
      value={{
        prefix,
        setPrefix,
        armed,
        paletteOpen,
        setPaletteOpen,
        helpOpen,
        setHelpOpen,
        message,
        showMessage,
        theme,
        toggleTheme,
      }}
    >
      {children}
      <CommandPalette />
      <HelpOverlay />
    </Ctx.Provider>
  );
}
