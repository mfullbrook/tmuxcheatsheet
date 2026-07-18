import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/lib/data/guides";

export const metadata: Metadata = {
  title: "tmux guides — the deep fixes",
  description:
    "In-depth tmux guides: the sane config explained, fixing colors, neovim integration, tmux vs zellij, and running AI coding agents in tmux.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndex() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-16">
      <h1 className="text-3xl font-semibold tracking-tight mb-3">Guides</h1>
      <p className="text-muted mb-10 max-w-2xl">
        The problems a cheat sheet can&apos;t fix — explained from mechanism to
        solution, tested against current tmux, with the stale advice called
        out.
      </p>
      <ul className="space-y-3">
        {GUIDES.map((g) => (
          <li
            key={g.slug}
            className="border border-edge bg-surface hover:border-accent-dim transition-colors"
          >
            <Link href={`/guides/${g.slug}`} className="block px-4 py-3.5">
              <span className="text-accent text-[15px]">{g.title}</span>
              <span className="block text-[13px] text-muted mt-1 leading-relaxed">
                {g.hook.slice(0, 140)}…
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
