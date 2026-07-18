import type { CliCommand } from "./types";

/**
 * Commands you type in a shell (outside tmux) or at the tmux command
 * prompt. Verified against tmux 3.6b `list-commands`.
 */
export const CLI_COMMANDS: CliCommand[] = [
  // ── Sessions ──────────────────────────────────────────────────────────
  {
    id: "new-session",
    cmd: "tmux new -s name",
    label: "Start a new named session",
    description:
      "Creates a session called `name` and attaches to it. Always name your sessions — `tmux new` alone gives you sessions called 0, 1, 2 and future-you will hate past-you.",
    category: "sessions",
    aliases: ["start", "create session", "new-session"],
    essential: true,
  },
  {
    id: "new-session-detached",
    cmd: "tmux new -s name -d",
    label: "Start a session without attaching",
    description:
      "Creates the session in the background — the building block for scripts that set up a workspace before you attach.",
    category: "sessions",
    aliases: ["detached", "background session"],
  },
  {
    id: "attach",
    cmd: "tmux attach -t name",
    label: "Attach to a session",
    description:
      "Reconnects to a running session. `tmux a` is enough if there's only one. This is the command you run after SSHing back in.",
    category: "sessions",
    aliases: ["reattach", "reconnect", "resume", "attach-session"],
    essential: true,
  },
  {
    id: "new-or-attach",
    cmd: "tmux new -As name",
    label: "Attach if it exists, create if not",
    description:
      "The `-A` flag makes `new-session` behave like attach when the session already exists. Put `tmux new -As main` in your login flow and you'll always land in the same workspace.",
    category: "sessions",
    aliases: ["attach or create", "idempotent"],
    essential: true,
  },
  {
    id: "list-sessions",
    cmd: "tmux ls",
    label: "List sessions",
    category: "sessions",
    aliases: ["show sessions", "list-sessions"],
    essential: true,
  },
  {
    id: "kill-session",
    cmd: "tmux kill-session -t name",
    label: "Kill a session",
    category: "sessions",
    aliases: ["close session", "delete session", "stop"],
    essential: true,
  },
  {
    id: "kill-other-sessions",
    cmd: "tmux kill-session -a",
    label: "Kill every session except the current one",
    category: "sessions",
    aliases: ["kill all", "cleanup"],
  },
  {
    id: "kill-server",
    cmd: "tmux kill-server",
    label: "Kill the tmux server and all sessions",
    description:
      "The nuclear option: stops every session, window, and pane. Also the honest answer to \"how do I make tmux reload everything from scratch\".",
    category: "sessions",
    aliases: ["quit tmux", "stop everything", "restart tmux"],
  },
  {
    id: "detach-cli",
    cmd: "tmux detach",
    label: "Detach (from the command prompt)",
    category: "sessions",
    aliases: ["disconnect"],
  },
  {
    id: "rename-session-cli",
    cmd: "tmux rename-session -t old new",
    label: "Rename a session",
    category: "sessions",
  },

  // ── Windows ───────────────────────────────────────────────────────────
  {
    id: "new-window-cli",
    cmd: "tmux neww -n name",
    label: "Create a named window",
    category: "windows",
    aliases: ["new-window"],
  },
  {
    id: "swap-window-cli",
    cmd: "swap-window -s 2 -t 1",
    label: "Swap two windows by index",
    category: "windows",
    aliases: ["reorder windows"],
  },
  {
    id: "move-window-renumber",
    cmd: "move-window -r",
    label: "Renumber windows to close gaps",
    description:
      "After closing windows you end up with 0, 1, 4, 7. This packs them back to 0, 1, 2, 3. Set `set -g renumber-windows on` to make it automatic.",
    category: "windows",
    aliases: ["renumber", "reindex"],
  },
  {
    id: "link-window",
    cmd: "link-window -s other:1",
    label: "Share a window from another session",
    category: "windows",
  },

  // ── Panes ─────────────────────────────────────────────────────────────
  {
    id: "join-pane",
    cmd: "join-pane -s :2",
    label: "Pull window 2 in as a pane here",
    description:
      "The opposite of break-pane: takes an existing window and merges it into the current window as a pane. Use `-h` for a side-by-side join.",
    category: "panes",
    aliases: ["merge window", "window to pane"],
  },
  {
    id: "synchronize-panes",
    cmd: "setw synchronize-panes",
    label: "Type into every pane at once (toggle)",
    description:
      "Mirrors your keystrokes to all panes in the window — the classic trick for running the same command on five servers. Run it again to turn it off.",
    category: "panes",
    aliases: ["sync panes", "broadcast", "multiple servers"],
    essential: true,
  },
  {
    id: "capture-pane",
    cmd: "capture-pane -p -S -1000",
    label: "Dump the last 1000 lines of a pane",
    description:
      "Prints pane scrollback to stdout — pipe it to a file with `capture-pane -p -S - > log.txt` style workflows, or use it from scripts to scrape output.",
    category: "panes",
    aliases: ["save scrollback", "export output", "dump"],
  },
  {
    id: "pipe-pane",
    cmd: "pipe-pane -o 'cat >> ~/pane.log'",
    label: "Log all pane output to a file (toggle)",
    category: "panes",
    aliases: ["logging", "record"],
  },
  {
    id: "respawn-pane",
    cmd: "respawn-pane -k",
    label: "Restart the command in a dead pane",
    category: "panes",
    aliases: ["restart pane", "dead pane"],
  },
  {
    id: "display-popup",
    cmd: "display-popup -E 'command'",
    label: "Run a command in a floating popup",
    description:
      "Opens a floating window over your panes, runs the command, and closes when it exits (`-E`). Added in tmux 3.2 — the feature that powers floating fzf pickers and lazygit overlays. Try `bind g display-popup -E -w 90% -h 90% lazygit`.",
    category: "panes",
    aliases: ["popup", "floating window", "overlay", "modal"],
    essential: true,
  },

  // ── Copy mode / buffers ───────────────────────────────────────────────
  {
    id: "list-buffers-cli",
    cmd: "tmux lsb",
    label: "List paste buffers",
    category: "buffers",
  },
  {
    id: "show-buffer",
    cmd: "tmux showb",
    label: "Print the newest buffer to stdout",
    category: "buffers",
    aliases: ["show clipboard"],
  },
  {
    id: "save-buffer",
    cmd: "tmux saveb file.txt",
    label: "Save the newest buffer to a file",
    category: "buffers",
  },
  {
    id: "load-buffer",
    cmd: "tmux loadb file.txt",
    label: "Load a file into a buffer",
    category: "buffers",
  },

  // ── Misc / power ──────────────────────────────────────────────────────
  {
    id: "source-config",
    cmd: "tmux source ~/.tmux.conf",
    label: "Reload your config",
    description:
      "Applies config changes to the running server. Note: it re-runs the file, it doesn't reset first — removed options keep their old values until you unset them or restart the server.",
    category: "misc",
    aliases: ["reload config", "apply tmux.conf", "source-file"],
    essential: true,
  },
  {
    id: "send-keys",
    cmd: "tmux send-keys -t name 'cmd' Enter",
    label: "Type into a session from outside",
    description:
      "Sends keystrokes to any pane from a script — the core of tmux automation. `-t session:window.pane` targets precisely.",
    category: "misc",
    aliases: ["automation", "scripting", "remote control"],
  },
  {
    id: "run-command-cli",
    cmd: "tmux <any command>",
    label: "Every tmux command works from the shell",
    description:
      "Anything you can type at the `:` prompt also works as `tmux <command>` from a shell — that's how scripts drive tmux.",
    category: "misc",
  },
  {
    id: "list-keys-cli",
    cmd: "tmux lsk -N | less",
    label: "Browse all keybindings with notes",
    category: "misc",
    aliases: ["help", "show keys"],
  },
  {
    id: "customize-mode-cli",
    cmd: "tmux customize-mode",
    label: "Interactive options browser",
    category: "misc",
  },
  {
    id: "wait-for",
    cmd: "tmux wait-for channel",
    label: "Synchronize scripts with tmux events",
    category: "misc",
  },
];
