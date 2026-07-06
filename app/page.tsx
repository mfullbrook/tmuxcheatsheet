import type { Metadata } from "next";
import Link from "next/link";
import { CheatSheet } from "@/components/CheatSheet";

export const metadata: Metadata = {
  title: "tmux cheat sheet — every keybinding, searchable & copy-ready",
  description:
    "The interactive tmux cheat sheet: all default keybindings and commands for sessions, windows, panes, and copy mode. Fuzzy search, custom prefix, one-click copy. Verified against the current tmux release.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16">
      <header className="mb-10">
        <p className="text-faint text-[13px] mb-2">
          <span className="text-accent">$</span> man tmux, but useful
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight cursor-blink">
          tmux cheat sheet
        </h1>
        <p className="text-muted mt-3 max-w-2xl">
          Every default keybinding and command — searchable, copyable, and
          honest about the gotchas. Press <kbd>/</kbd> to search anything.
          Press <kbd>Ctrl</kbd>+<kbd>b</kbd> then <kbd>?</kbd> — this site
          speaks tmux.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 text-[12.5px]">
          <span className="text-faint">
            verified against <span className="text-accent">tmux 3.6</span>{" "}
            defaults
          </span>
          <Link href="/tutorial" className="text-muted hover:text-accent">
            new to tmux? start with the tutorial →
          </Link>
          <Link
            href="/config/generator"
            className="text-muted hover:text-accent"
          >
            build your .tmux.conf →
          </Link>
        </div>
      </header>

      <CheatSheet />

      <section className="mt-16 border-t border-edge pt-8">
        <h2 className="text-lg font-semibold mb-4">
          The stuff cheat sheets can&apos;t fix
        </h2>
        <p className="text-muted text-[13.5px] mb-4 max-w-2xl">
          The keys are the easy part. These guides fix the things people
          actually fight with:
        </p>
        <ul className="grid sm:grid-cols-2 gap-2 text-[13.5px]">
          <li>
            <Link
              href="/commands/copy-to-system-clipboard"
              className="text-accent hover:underline"
            >
              → copy to the real clipboard (macOS / Linux / SSH)
            </Link>
          </li>
          <li>
            <Link href="/commands/scroll" className="text-accent hover:underline">
              → make scrolling work like a normal terminal
            </Link>
          </li>
          <li>
            <Link
              href="/guides/sane-tmux-config"
              className="text-accent hover:underline"
            >
              → the sane 20-line config, explained line by line
            </Link>
          </li>
          <li>
            <Link
              href="/guides/tmux-and-neovim"
              className="text-accent hover:underline"
            >
              → fix every neovim :checkhealth warning
            </Link>
          </li>
          <li>
            <Link
              href="/guides/tmux-colors"
              className="text-accent hover:underline"
            >
              → why your colors look wrong (and the 3-line fix)
            </Link>
          </li>
          <li>
            <Link
              href="/commands/save-restore-sessions"
              className="text-accent hover:underline"
            >
              → make sessions survive reboots
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
