"use client";

import { useTmuxSite } from "./KeyboardProvider";

const SITE_KEYS: Array<[string, string]> = [
  ["C-b 0…4", "jump to page (window)"],
  ["C-b n / p", "next / previous page"],
  ["C-b w", "page & command picker"],
  ["C-b /", "search"],
  ["C-b ?", "this help"],
  ["C-b t", "toggle light/dark theme"],
  ["C-b g / G", "scroll to top / bottom"],
  ["C-b d", "detach (close overlays)"],
  ["/", "search"],
  ["⌘K / C-k", "search"],
];

export function HelpOverlay() {
  const { helpOpen, setHelpOpen } = useTmuxSite();
  if (!helpOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-[12vh] px-4"
      onClick={() => setHelpOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Site keyboard shortcuts"
    >
      <div
        className="w-full max-w-md bg-surface border border-edge-bright shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-edge px-3 py-2 flex items-center justify-between">
          <span className="text-accent">list-keys (this site)</span>
          <button
            onClick={() => setHelpOpen(false)}
            className="text-faint hover:text-fg"
            aria-label="Close"
          >
            [x]
          </button>
        </div>
        <div className="p-4">
          <p className="text-muted mb-3 text-[13px]">
            This site speaks tmux. Press{" "}
            <kbd>Ctrl</kbd>+<kbd>b</kbd>, then a key — exactly like the real
            thing.
          </p>
          <table className="w-full text-[13px]">
            <tbody>
              {SITE_KEYS.map(([keys, desc]) => (
                <tr key={keys}>
                  <td className="py-1 pr-4 text-accent whitespace-nowrap align-top">
                    {keys}
                  </td>
                  <td className="py-1 text-muted">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-faint mt-3 text-[12px]">
            q or Escape to close — muscle memory transfers.
          </p>
        </div>
      </div>
    </div>
  );
}
