import type { Metadata } from "next";
import Link from "next/link";
import { TmuxPlayground } from "@/components/TmuxPlayground";
import { LESSONS } from "@/lib/data/lessons";

export const metadata: Metadata = {
  title: "Learn tmux in your browser — interactive tutorial",
  description:
    "Learn tmux hands-on: an interactive in-browser playground with real keybindings, plus a 5-lesson track from the mental model to a sane config.",
  alternates: { canonical: "/tutorial" },
};

export default function TutorialPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-16">
      <header className="mb-8">
        <p className="text-faint text-[13px] mb-2">
          <span className="text-accent">$</span> learn tmux — no installation,
          no risk
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Try tmux, right here
        </h1>
        <p className="text-muted mt-3 max-w-2xl">
          This is a simulated tmux session that responds to the real
          keybindings. Click it, press <kbd>Ctrl</kbd>+<kbd>b</kbd> then{" "}
          <kbd>%</kbd>, and work through the missions — you&apos;ll have the
          muscle memory before you ever open a terminal.
        </p>
      </header>

      <TmuxPlayground />

      <section className="mt-14">
        <h2 className="text-xl font-semibold mb-2">Then learn why it works</h2>
        <p className="text-muted text-[13.5px] mb-6 max-w-2xl">
          Five short lessons: mental model first, keybindings second, config
          last. About 25 minutes end to end.
        </p>
        <ol className="space-y-2">
          {LESSONS.map((l) => (
            <li key={l.slug}>
              <Link
                href={`/tutorial/${l.slug}`}
                className="flex items-baseline gap-3 border border-edge bg-surface px-4 py-3 hover:border-accent-dim transition-colors group"
              >
                <span className="text-faint text-[13px]">{l.num}</span>
                <span className="flex-1">
                  <span className="text-fg group-hover:text-accent transition-colors">
                    {l.title}
                  </span>
                  <span className="block text-[13px] text-muted mt-0.5">
                    {l.intro.slice(0, 90)}…
                  </span>
                </span>
                <span className="text-accent">→</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
