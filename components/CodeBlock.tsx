"use client";

import { useTmuxSite } from "./KeyboardProvider";
import { copyText } from "@/lib/copy";

export function CodeBlock({
  code,
  label,
}: {
  code: string;
  label?: string;
}) {
  const { showMessage } = useTmuxSite();
  return (
    <div className="relative group border border-edge bg-raised my-3">
      {label && (
        <div className="border-b border-edge px-3 py-1 text-[11px] text-faint flex justify-between items-center">
          <span>{label}</span>
        </div>
      )}
      <button
        className="absolute top-1.5 right-2 text-[12px] text-faint hover:text-accent opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        onClick={async () => {
          const ok = await copyText(code);
          showMessage(
            ok ? "copied to clipboard" : "copy failed — select manually",
          );
        }}
        aria-label="Copy code"
      >
        [copy]
      </button>
      <pre className="overflow-x-auto px-3 py-2.5 text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
