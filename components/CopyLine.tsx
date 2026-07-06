"use client";

import { useTmuxSite } from "./KeyboardProvider";
import { copyText } from "@/lib/copy";

/** A single copyable command line, terminal-prompt styled. */
export function CopyLine({ text }: { text: string }) {
  const { showMessage } = useTmuxSite();
  return (
    <button
      className="group flex items-center gap-2 w-full text-left border border-edge bg-raised px-3 py-2 hover:border-accent-dim transition-colors"
      onClick={async () => {
        const ok = await copyText(text);
        showMessage(
          ok
            ? `copied: ${text.length > 60 ? text.slice(0, 57) + "…" : text}`
            : "copy failed — select manually",
        );
      }}
      aria-label={`Copy: ${text}`}
    >
      <span className="text-accent select-none">$</span>
      <code className="flex-1 text-[13.5px] overflow-x-auto whitespace-nowrap">
        {text}
      </code>
      <span className="text-[11px] text-faint group-hover:text-accent shrink-0">
        [copy]
      </span>
    </button>
  );
}
