import type { Metadata } from "next";
import Link from "next/link";
import { COMMAND_PAGES } from "@/lib/data/command-pages";

export const metadata: Metadata = {
  title: "tmux commands — task-based reference",
  description:
    "Every common tmux task with its keybinding, command, and the gotchas: sessions, windows, panes, copy & paste, scrolling, scripting, and more.",
  alternates: { canonical: "/commands" },
};

const GROUPS: Array<{ title: string; slugs: string[] }> = [
  {
    title: "Sessions",
    slugs: [
      "new-session",
      "attach-session",
      "detach",
      "switch-sessions",
      "list-sessions",
      "rename-session",
      "kill-session",
      "exit-tmux",
      "save-restore-sessions",
      "move-process-into-tmux",
    ],
  },
  {
    title: "Windows",
    slugs: [
      "new-window",
      "rename-window",
      "switch-windows",
      "move-window",
      "kill-window",
    ],
  },
  {
    title: "Panes",
    slugs: [
      "split-pane",
      "switch-panes",
      "resize-pane",
      "zoom-pane",
      "swap-panes",
      "close-pane",
      "break-pane",
      "join-pane",
      "synchronize-panes",
      "popup-window",
    ],
  },
  {
    title: "Copy, paste & scrolling",
    slugs: [
      "scroll",
      "copy-paste",
      "copy-to-system-clipboard",
      "search-scrollback",
      "mouse-mode",
      "history-limit",
    ],
  },
  {
    title: "Config & scripting",
    slugs: [
      "reload-config",
      "command-prompt",
      "list-keys",
      "send-keys",
      "capture-pane",
      "nested-tmux",
    ],
  },
];

export default function CommandsIndex() {
  const bySlug = new Map(COMMAND_PAGES.map((p) => [p.slug, p]));
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-16">
      <h1 className="text-3xl font-semibold tracking-tight mb-3">
        tmux commands, by task
      </h1>
      <p className="text-muted max-w-2xl mb-10">
        Not a man page: each page answers one real task, answer-first —
        keybinding, command, and the gotchas that cost people an afternoon.
      </p>
      <div className="space-y-10">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="text-[13px] uppercase tracking-wide text-faint mb-3">
              {g.title}
            </h2>
            <ul className="grid sm:grid-cols-2 gap-1.5 text-[14px]">
              {g.slugs.map((slug) => {
                const p = bySlug.get(slug);
                if (!p) return null;
                return (
                  <li key={slug}>
                    <Link
                      href={`/commands/${slug}`}
                      className="text-accent hover:underline"
                    >
                      → {p.title.replace(/^How to /, "")}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
