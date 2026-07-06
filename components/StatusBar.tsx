"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SITE_WINDOWS } from "@/lib/site-nav";
import { useTmuxSite } from "./KeyboardProvider";

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    const raf = requestAnimationFrame(update);
    const t = setInterval(update, 30_000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
    };
  }, []);
  if (!now) return <span className="w-12" />;
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return (
    <span suppressHydrationWarning>
      {hh}:{mm}
    </span>
  );
}

export function StatusBar() {
  const pathname = usePathname();
  const { armed, message, setHelpOpen, toggleTheme, theme } = useTmuxSite();

  const activeIndex = SITE_WINDOWS.reduce(
    (acc, w) =>
      (w.href === "/" ? pathname === "/" : pathname.startsWith(w.href))
        ? w.index
        : acc,
    0,
  );

  return (
    <div className="print-hidden fixed bottom-0 inset-x-0 z-40 h-10 border-t border-edge bg-surface text-[13px] select-none">
      {message ? (
        <div className="h-full flex items-center px-3 bg-[var(--cat-copy)] text-black font-medium">
          {message}
        </div>
      ) : (
        <div className="h-full flex items-center gap-1 px-2 sm:px-3 overflow-x-auto">
          <Link
            href="/"
            className="text-accent font-semibold shrink-0 hover:brightness-125"
          >
            [tmuxlab]
          </Link>
          <nav className="flex items-center shrink-0" aria-label="Primary">
            {SITE_WINDOWS.map((w) => {
              const active = w.index === activeIndex;
              return (
                <Link
                  key={w.index}
                  href={w.href}
                  className={
                    "px-1.5 py-0.5 whitespace-nowrap " +
                    (active
                      ? "bg-accent text-black font-medium"
                      : "text-muted hover:text-fg")
                  }
                >
                  {w.index}:{w.name}
                  {active ? "*" : ""}
                </Link>
              );
            })}
          </nav>
          <div className="flex-1" />
          <div className="flex items-center gap-3 shrink-0 text-muted">
            <span
              className={
                "px-1.5 py-0.5 font-semibold " +
                (armed
                  ? "bg-accent text-black"
                  : "text-faint")
              }
              title="Press Ctrl-b — this site speaks tmux"
            >
              ^B
            </span>
            <button
              onClick={() => setHelpOpen(true)}
              className="hover:text-fg"
              aria-label="Keyboard shortcuts"
            >
              ?:keys
            </button>
            <button
              onClick={toggleTheme}
              className="hover:text-fg"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "☾" : "☀"}
            </button>
            <a
              href="https://github.com/"
              className="hover:text-fg hidden sm:inline"
              title="Open source on GitHub"
            >
              gh
            </a>
            <Clock />
          </div>
        </div>
      )}
    </div>
  );
}
