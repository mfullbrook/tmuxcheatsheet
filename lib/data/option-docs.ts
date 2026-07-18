/**
 * Shared human explanations for tmux options.
 *
 * Consumed by the config generator (its emitted `# comments` for options
 * with a one-to-one comment come from here) and by the /config/explain
 * page's annotations. Summaries may contain `\n` to force a line break in
 * generated-config comments; flatten to a space for single-line display.
 */

export interface OptionDoc {
  /** Short human explanation of what the option does. */
  summary: string;
  /** Route to a relevant guide or command page, when one clearly exists. */
  link?: string;
}

export const OPTION_DOCS: Record<string, OptionDoc> = {
  // -- core -----------------------------------------------------------
  prefix: {
    summary:
      "the key you press before every tmux binding (default C-b)",
    link: "/guides/sane-tmux-config",
  },
  "default-terminal": {
    summary:
      "proper colors: tell tmux its own terminal type, and that the outer terminal can do 24-bit RGB (fixes washed-out themes)",
    link: "/guides/tmux-colors",
  },
  "terminal-features": {
    summary:
      "declare what the outer terminal can do (RGB means 24-bit true color)",
    link: "/guides/tmux-colors",
  },
  mouse: {
    summary: "mouse: wheel scrolling, click to focus panes, drag borders",
    link: "/commands/mouse-mode",
  },
  "history-limit": {
    summary: "bigger scrollback (default is tiny; affects new panes)",
    link: "/commands/scroll",
  },
  "escape-time": {
    summary:
      "how long tmux waits after Esc before passing it through; a low value removes the mode-switch lag vim/neovim users feel",
    link: "/guides/tmux-and-neovim",
  },
  "focus-events": {
    summary:
      "pass terminal focus events through to programs — lets vim/neovim autoread reload changed files",
    link: "/guides/tmux-and-neovim",
  },
  "base-index": {
    summary:
      "number windows from 1 instead of 0 (matches keyboard order)",
    link: "/guides/sane-tmux-config",
  },
  "pane-base-index": {
    summary: "number panes from 1 too, matching the window numbering",
    link: "/guides/sane-tmux-config",
  },
  "renumber-windows": {
    summary: "renumber windows when one closes so there are no gaps",
    link: "/guides/sane-tmux-config",
  },

  // -- copy mode / clipboard -----------------------------------------
  "mode-keys": {
    summary: "vi keys in copy mode; v selects, y copies (like vim)",
    link: "/commands/copy-paste",
  },
  "set-clipboard": {
    summary:
      "sync copies to the system clipboard via OSC 52\n(works over SSH in modern terminals)",
    link: "/commands/copy-to-system-clipboard",
  },

  // -- status bar -----------------------------------------------------
  "status-position": {
    summary: "put the status bar at the top or bottom of the screen",
  },
  "status-style": {
    summary: "colors and attributes of the status line",
  },
  "status-left": {
    summary: "what to show on the left of the status line (#S = session name)",
  },
  "status-left-length": {
    summary: "max width of the status line's left section",
  },
  "status-right": {
    summary: "what to show on the right of the status line",
  },
  "window-status-current-style": {
    summary: "how the active window's name is highlighted in the status line",
  },

  // -- plugins --------------------------------------------------------
  "@plugin": {
    summary: "a plugin managed by tpm (install with prefix + I)",
  },
  "@continuum-restore": {
    summary: "have tmux-continuum auto-restore the last saved session on start",
  },
};

/**
 * Render an option's summary as `# `-prefixed comment lines for generated
 * configs. Respects explicit `\n` breaks, then greedily wraps at `width`.
 */
export function optionComment(name: string, width = 62): string[] {
  const doc = OPTION_DOCS[name];
  if (!doc) return [];
  const lines: string[] = [];
  for (const para of doc.summary.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      if (line && line.length + 1 + word.length > width) {
        lines.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) lines.push(line);
  }
  return lines.map((l) => `# ${l}`);
}
