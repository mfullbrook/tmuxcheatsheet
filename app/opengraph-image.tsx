import { ImageResponse } from "next/og";
import { OgCard, BindingCell, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/card";

export const alt = "tmuxlab — the tmux cheat sheet";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Default tmux bindings only — never personalized.
const BINDINGS = [
  { keys: "C-b %", label: "split right" },
  { keys: 'C-b "', label: "split down" },
  { keys: "C-b c", label: "new window" },
  { keys: "C-b d", label: "detach" },
  { keys: "C-b [", label: "copy mode" },
  { keys: "C-b z", label: "zoom pane" },
];

export default function Image() {
  return new ImageResponse(
    (
      <OgCard kicker="tmuxlab" title="the tmux cheat sheet">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, maxWidth: 1060 }}>
          {BINDINGS.map((b) => (
            <BindingCell key={b.keys} keys={b.keys} label={b.label} />
          ))}
        </div>
      </OgCard>
    ),
    size
  );
}
