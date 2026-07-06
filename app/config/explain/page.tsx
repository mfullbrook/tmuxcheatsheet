import type { Metadata } from "next";
import { ExplainTool } from "@/components/ExplainTool";

export const metadata: Metadata = {
  title: "Explain my .tmux.conf",
  description:
    "Paste your .tmux.conf and get a line-by-line explanation: what every binding and option does, what's changed from the defaults, and which lines are outdated advice. 100% client-side — your config never leaves the browser.",
  alternates: { canonical: "/config/explain" },
};

export default function ExplainPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-16">
      <h1 className="text-3xl font-semibold tracking-tight mb-3">
        Explain my .tmux.conf
      </h1>
      <p className="text-muted max-w-2xl mb-2">
        Paste your config and get a line-by-line explanation — what every
        binding and option does, what you&apos;ve changed from the defaults,
        and warnings for lines that are stale advice on modern tmux. Then
        apply it, and the cheat sheet, search, and command pages speak your
        keys.
      </p>
      <p className="text-faint text-[13px] mb-8">
        Parsing is 100% client-side — your config never leaves the browser.
      </p>
      <ExplainTool />
    </main>
  );
}
