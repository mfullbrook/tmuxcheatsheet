import { ImageResponse } from "next/og";
import { LESSONS } from "@/lib/data/lessons";
import { OgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/card";

export const alt = "tmux tutorial lesson — tmuxlab";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return LESSONS.map((l) => ({ slug: l.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = LESSONS.find((l) => l.slug === slug);

  return new ImageResponse(
    (
      <OgCard
        kicker="tmuxlab / tutorial"
        title={lesson?.title ?? "learn tmux"}
        subtitle="an interactive tmux tutorial"
      />
    ),
    size
  );
}
