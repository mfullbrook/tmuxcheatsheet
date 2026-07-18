/** Which key table a binding lives in (see `tmux list-keys -T <table>`). */
export type KeyTable = "prefix" | "root" | "copy-mode-vi" | "copy-mode";

export type CategoryId =
  | "sessions"
  | "windows"
  | "panes"
  | "resize-layout"
  | "copy-mode"
  | "buffers"
  | "misc";

export interface Category {
  id: CategoryId;
  title: string;
  /** Short blurb shown under the category heading. */
  blurb: string;
}

export interface KeyBinding {
  /** Stable slug, used for URLs and anchors, e.g. "split-pane-horizontal". */
  id: string;
  /** Display key(s) after the prefix, e.g. "%" or "C-o". Tmux key notation. */
  keys: string;
  table: KeyTable;
  /** The tmux command the key runs (verbatim from list-keys, simplified). */
  command: string;
  /** Short human label shown in the cheat sheet row. */
  label: string;
  /** Longer explanation for detail views / per-command pages. */
  description?: string;
  category: CategoryId;
  /** Extra search terms people actually type ("vertical split", "quit"). */
  aliases?: string[];
  /** True if bound with -r (repeatable while prefix is held). */
  repeatable?: boolean;
  /** A gotcha, tip, or clarification worth surfacing inline. */
  note?: string;
  /** Show in the "essentials" view — the ~30 bindings that cover 95% of use. */
  essential?: boolean;
  /**
   * The real canonical tmux key names this row covers, exactly as
   * `tmux list-keys` prints them (Up/Down/Left/Right, PPage/NPage, Space,
   * Enter, M-Up, C-Up, ...). Grouped display rows enumerate every key,
   * e.g. keys "↑ ↓ ← →" → ["Up", "Down", "Left", "Right"].
   */
  matchKeys: string[];
  /**
   * Canonical tmux command(s) as `tmux list-keys` prints them (full command
   * names; for copy-mode tables the bare `send-keys -X` action name, with
   * format/pipe arguments dropped).
   *
   * Convention: if matchCommands.length === 1, that single command applies
   * to every key in matchKeys. Otherwise matchCommands must be parallel to
   * matchKeys (index i of matchKeys runs index i of matchCommands).
   */
  matchCommands: string[];
}

export interface CliCommand {
  id: string;
  /** The command as typed in a shell, e.g. `tmux new -s work`. */
  cmd: string;
  label: string;
  description?: string;
  category: CategoryId;
  aliases?: string[];
  note?: string;
  essential?: boolean;
}
