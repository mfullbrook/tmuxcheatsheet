import { ImageResponse } from "next/og";
import { GUIDES } from "@/lib/data/guides";
import { OgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/card";

export const alt = "tmux guide — tmuxlab";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);

  return new ImageResponse(
    (
      <OgCard
        kicker="tmuxlab / guides"
        title={guide?.title ?? "tmux guides"}
      />
    ),
    size
  );
}
