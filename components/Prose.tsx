import { Fragment } from "react";

/** Renders prose with inline `code` spans. No markdown lib needed. */
export function InlineCode({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <code
            key={i}
            className="bg-raised border border-edge px-1 py-px text-[0.9em] text-accent whitespace-nowrap"
          >
            {part}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
