import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "tmux config — .tmux.conf guides and generator",
  description:
    "Everything about configuring tmux: an interactive .tmux.conf generator, the sane baseline config explained, colors, clipboard, and vim integration.",
  alternates: { canonical: "/config" },
};

const LINKS = [
  ["/config/explain", "Explain my .tmux.conf", "paste your config: line-by-line annotations + stale-advice warnings"],
  ["/config/generator", "Interactive .tmux.conf generator", "toggle options, get a commented config"],
  ["/guides/sane-tmux-config", "The sane tmux config", "20 lines, explained line by line"],
  ["/guides/tmux-colors", "Fix your colors", "$TERM, true color, and the decision tree"],
  ["/guides/tmux-and-neovim", "tmux + neovim", "resolve every :checkhealth warning"],
  ["/commands/copy-to-system-clipboard", "System clipboard setup", "macOS, Linux, and over SSH"],
  ["/commands/reload-config", "Reload your config", "and why removed lines don't reset"],
] as const;

export default function ConfigHub() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-16">
      <h1 className="text-3xl font-semibold tracking-tight mb-3">
        Configuring tmux
      </h1>
      <p className="text-muted mb-10 max-w-2xl">
        tmux&apos;s defaults are famously hostile — a small, well-understood
        config fixes 90% of daily friction. Start with the generator or the
        annotated baseline.
      </p>
      <ul className="space-y-3">
        {LINKS.map(([href, title, hint]) => (
          <li key={href} className="border border-edge bg-surface hover:border-accent-dim transition-colors">
            <Link href={href} className="block px-4 py-3">
              <span className="text-accent">{title}</span>
              <span className="block text-[13px] text-muted">{hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
