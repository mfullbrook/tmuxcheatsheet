import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/card";

export const alt = "Explain my .tmux.conf — tmuxlab";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    (
      <OgCard
        kicker="tmuxlab / config"
        title="Explain my .tmux.conf"
        subtitle="paste your config, get a line-by-line explanation"
      />
    ),
    size
  );
}
