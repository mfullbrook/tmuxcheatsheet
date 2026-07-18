import { ImageResponse } from "next/og";
import { COMMAND_PAGES, getCommandPage } from "@/lib/data/command-pages";
import { OgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/card";

export const alt = "tmux command reference — tmuxlab";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return COMMAND_PAGES.map((p) => ({ slug: p.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getCommandPage(slug);
  const title = page?.title ?? "tmux commands";
  // Default bindings only — never personalized.
  const keys = page?.tldr.keys ? `prefix + ${page.tldr.keys}` : page?.tldr.command;

  return new ImageResponse(
    (
      <OgCard kicker="tmuxlab / commands" title={title} keys={keys} />
    ),
    size
  );
}
