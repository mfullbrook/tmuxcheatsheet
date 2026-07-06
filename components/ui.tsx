"use client";

import { useTmuxSite } from "./KeyboardProvider";
import { copyText } from "@/lib/copy";
import type { CategoryId } from "@/lib/data/types";

export const CATEGORY_COLOR: Record<CategoryId, string> = {
  sessions: "var(--cat-sessions)",
  windows: "var(--cat-windows)",
  panes: "var(--cat-panes)",
  "resize-layout": "var(--cat-resize)",
  "copy-mode": "var(--cat-copy)",
  buffers: "var(--cat-buffers)",
  misc: "var(--cat-misc)",
};

/** Renders the user's prefix (from settings) + a key, tmux-style. */
export function KeyCombo({
  keys,
  withPrefix,
}: {
  keys: string;
  withPrefix?: boolean;
}) {
  const { prefix } = useTmuxSite();
  return (
    <span className="whitespace-nowrap">
      {withPrefix && (
        <>
          <kbd className="text-accent border-accent-dim">{prefix}</kbd>
          <span className="text-faint mx-1">then</span>
        </>
      )}
      {keys.split(" ").map((k, i) => (
        <kbd key={i} className={i > 0 ? "ml-1" : ""}>
          {k}
        </kbd>
      ))}
    </span>
  );
}

export function CopyButton({
  text,
  label,
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const { showMessage } = useTmuxSite();
  return (
    <button
      className={
        "text-faint hover:text-accent transition-colors text-[12px] " +
        className
      }
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = await copyText(text);
        showMessage(
          ok
            ? `copied: ${text.length > 60 ? text.slice(0, 57) + "…" : text}`
            : "copy failed — select manually",
        );
      }}
      aria-label={label ?? `Copy ${text}`}
      title="Copy"
    >
      [copy]
    </button>
  );
}

/** Choose your prefix — re-renders every keybinding on the site. */
export function PrefixPicker() {
  const { prefix, setPrefix, showMessage } = useTmuxSite();
  const options = ["C-b", "C-a", "C-Space", "`"];
  return (
    <div className="inline-flex items-center gap-2 text-[13px]">
      <span className="text-muted">your prefix:</span>
      <div className="inline-flex border border-edge">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => {
              setPrefix(o);
              showMessage(`prefix set to ${o} — the whole site now shows it`);
            }}
            className={
              "px-2 py-0.5 " +
              (prefix === o
                ? "bg-accent text-black font-medium"
                : "text-muted hover:text-fg hover:bg-hover")
            }
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A section framed like a tmux pane, title embedded in the border. */
export function Pane({
  title,
  color,
  children,
  id,
  className = "",
}: {
  title: string;
  color?: string;
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={"relative border border-edge bg-surface " + className}
      style={color ? { borderTopColor: color } : undefined}
    >
      <div
        className="absolute -top-[11px] left-3 bg-bg px-2 text-[12px] font-medium"
        style={{ color: color ?? "var(--text-muted)" }}
      >
        ┤ {title} ├
      </div>
      {children}
    </section>
  );
}
