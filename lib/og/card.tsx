/**
 * Shared OG card template rendered via next/og ImageResponse.
 *
 * ImageResponse supports a limited flexbox subset: no CSS variables, and
 * every element with multiple children must be display:flex. Palette hex
 * values are copied literally from app/globals.css (dark theme).
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// From app/globals.css (dark palette)
const BG = "#0b0e14";
const BG_SURFACE = "#10141c";
const BG_RAISED = "#161c27";
const BORDER = "#222b39";
const TEXT = "#cbd6e2";
const TEXT_MUTED = "#8b9bb0";
const TEXT_FAINT = "#5d6d82";
const ACCENT = "#3ee08a";
const ACCENT_DIM = "#2aa868";

const MONO =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

export interface OgCardProps {
  /** Small label above the title, e.g. "tmuxlab / commands" */
  kicker: string;
  title: string;
  /** Keybinding chip, e.g. "C-b %" — rendered prominently. */
  keys?: string;
  /** Fallback / supporting line under the title. */
  subtitle?: string;
  /** Extra content rendered between title and status bar (e.g. binding grid). */
  children?: React.ReactNode;
}

function StatusBar() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 56,
        backgroundColor: BG_RAISED,
        borderTop: `2px solid ${BORDER}`,
        padding: "0 32px",
        fontSize: 24,
        fontFamily: MONO,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <span style={{ color: ACCENT }}>[tmuxlab]</span>
        <span style={{ color: TEXT_MUTED }}>0:commands</span>
        <span style={{ color: TEXT }}>1:guides*</span>
        <span style={{ color: TEXT_MUTED }}>2:tutorial</span>
      </div>
      <div style={{ display: "flex", color: TEXT_FAINT }}>
        tmuxlab.dev
      </div>
    </div>
  );
}

export function OgCard({ kicker, title, keys, subtitle, children }: OgCardProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: BG,
        fontFamily: MONO,
      }}
    >
      {/* Terminal window title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "24px 48px",
          backgroundColor: BG_SURFACE,
          borderBottom: `2px solid ${BORDER}`,
        }}
      >
        <div style={{ display: "flex", width: 18, height: 18, borderRadius: 9, backgroundColor: "#e0604f" }} />
        <div style={{ display: "flex", width: 18, height: 18, borderRadius: 9, backgroundColor: "#e0b04f" }} />
        <div style={{ display: "flex", width: 18, height: 18, borderRadius: 9, backgroundColor: ACCENT_DIM }} />
        <div style={{ display: "flex", marginLeft: 16, color: TEXT_FAINT, fontSize: 24 }}>
          {kicker}
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          justifyContent: "center",
          padding: "0 72px",
          gap: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
          <span style={{ color: ACCENT, fontSize: 52, lineHeight: 1.15 }}>$&nbsp;</span>
          <span
            style={{
              color: TEXT,
              fontSize: 52,
              lineHeight: 1.15,
              fontWeight: 700,
            }}
          >
            {title}
          </span>
        </div>
        {keys ? (
          <div style={{ display: "flex" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: BG_RAISED,
                border: `2px solid ${ACCENT_DIM}`,
                borderRadius: 12,
                padding: "14px 28px",
                fontSize: 44,
                color: ACCENT,
              }}
            >
              {keys}
            </div>
          </div>
        ) : null}
        {subtitle ? (
          <div style={{ display: "flex", color: TEXT_MUTED, fontSize: 30, lineHeight: 1.4 }}>
            {subtitle}
          </div>
        ) : null}
        {children}
      </div>

      <StatusBar />
    </div>
  );
}

/** Small keybinding cell used by the home-page binding grid. */
export function BindingCell({ keys, label }: { keys: string; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        backgroundColor: BG_RAISED,
        border: `2px solid ${BORDER}`,
        borderRadius: 12,
        padding: "16px 24px",
      }}
    >
      <span style={{ color: ACCENT, fontSize: 30 }}>{keys}</span>
      <span style={{ color: TEXT_MUTED, fontSize: 26 }}>{label}</span>
    </div>
  );
}
