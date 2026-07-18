import type { Metadata } from "next";
import Link from "next/link";
import { ConfigGenerator } from "@/components/ConfigGenerator";

export const metadata: Metadata = {
  title: ".tmux.conf generator — build a sane tmux config",
  description:
    "Interactive tmux config generator: pick your prefix, mouse mode, vi keys, clipboard method, true color, and plugins — get a fully commented .tmux.conf to copy or download.",
  alternates: { canonical: "/config/generator" },
};

export default function GeneratorPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16">
      <h1 className="text-3xl font-semibold tracking-tight mb-3">
        .tmux.conf generator
      </h1>
      <p className="text-muted max-w-2xl mb-2">
        Toggle what you want; every generated line is commented so you know
        exactly what it does. The defaults here are the ten fixes almost
        every tmux user makes eventually — start with them.
      </p>
      <p className="text-faint text-[13px] mb-8">
        Want the reasoning? Read{" "}
        <Link href="/guides/sane-tmux-config" className="text-accent hover:underline">
          the sane tmux config, explained line by line
        </Link>
        .
      </p>
      <ConfigGenerator />
    </main>
  );
}
