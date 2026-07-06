"use client";

/**
 * "Your binding" line for command pages (T11). The pages are server
 * components; this island reads the parsed-config overlay client-side and
 * renders nothing when no config is active (SSR output = defaults, no
 * layout shift for config-less visitors beyond a small appended line).
 */

import { ALL_BINDINGS } from "@/lib/data/keybindings";
import { useOptionalConfig } from "./ConfigProvider";
import { KeyCombo } from "./ui";

export function YourBinding({ bindingIds }: { bindingIds?: string[] }) {
  const config = useOptionalConfig();
  if (
    !bindingIds ||
    bindingIds.length === 0 ||
    !config ||
    config.status !== "active" ||
    config.showDefaults ||
    !config.overlay
  ) {
    return null;
  }
  const items = bindingIds.flatMap((id) => {
    const entry = config.overlay!.entries.get(id);
    const binding = ALL_BINDINGS.find((b) => b.id === id);
    if (!entry || !binding || entry.status === "default") return [];
    return [{ id, entry, binding }];
  });
  if (items.length === 0) return null;

  return (
    <div className="mt-2 border-t border-edge pt-2">
      {items.map(({ id, entry, binding }) => (
        <p key={id} className="text-[13.5px] py-0.5">
          <span className="text-faint text-[12px] mr-2">
            your binding
          </span>
          {entry.status === "unbound" ? (
            <span className="text-muted">
              <span className="line-through opacity-70">
                <KeyCombo
                  keys={binding.keys}
                  withPrefix={binding.table === "prefix"}
                />
              </span>
              <span className="ml-2 text-cat-resize text-[12px]">
                unbound in your config
              </span>
            </span>
          ) : (
            <>
              <KeyCombo
                keys={entry.userKeys.join(" ")}
                withPrefix={binding.table === "prefix" && !entry.noPrefix}
              />
              {items.length > 1 && (
                <span className="ml-2 text-faint text-[12px]">
                  {binding.label}
                </span>
              )}
              {entry.annotations.length > 0 && (
                <span className="ml-2 text-cat-resize text-[12px]">
                  {entry.annotations.join(" · ")}
                </span>
              )}
            </>
          )}
        </p>
      ))}
    </div>
  );
}
