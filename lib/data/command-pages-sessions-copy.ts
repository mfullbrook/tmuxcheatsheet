import type { CommandPage } from "./command-page-types";

export const SESSION_COPY_MISC_PAGES: CommandPage[] = [
  // ── Sessions ──────────────────────────────────────────────────────────
  {
    slug: "new-session",
    title: "How to create a new session in tmux",
    metaDescription:
      "Start a named tmux session with tmux new -s, create sessions in the background, and use tmux new -As to attach-or-create in one command.",
    tldr: {
      text: "Start a new named session:",
      command: "tmux new -s work",
    },
    sections: [
      {
        heading: "Always name your sessions",
        body: "A bare `tmux` gives you sessions named 0, 1, 2 — impossible to tell apart in a week. Names make `tmux attach -t work` and the `prefix s` picker actually useful.",
      },
      {
        heading: "The one command to remember",
        body: "`tmux new -As work` attaches to \"work\" if it exists and creates it if it doesn't — idempotent, script-safe, and the best thing to put in your SSH workflow:",
        code: "tmux new -As main",
      },
      {
        heading: "From inside tmux",
        body: 'Running `tmux new` inside tmux fails with "sessions should be nested with care". You don\'t want nesting — you want a new session on the same server: `prefix :` then `new-session -s name`, or from the shell `tmux new -d -s name` then switch with `prefix s`.',
      },
    ],
    related: ["attach-session", "switch-sessions", "rename-session", "detach"],
  },
  {
    slug: "attach-session",
    title: "How to attach to a tmux session",
    metaDescription:
      "Reattach to a running tmux session with tmux attach -t name, list sessions with tmux ls, and fix the shrunken-window problem when attaching from two places.",
    tldr: {
      text: "Reattach to a session (tmux a is enough if there's only one):",
      command: "tmux attach -t work",
    },
    sections: [
      {
        heading: "The standard reconnect flow",
        body: "SSH back in, run `tmux ls` to see what's running, then `tmux attach -t name`. Everything is exactly where you left it — that's the entire reason tmux exists.",
      },
      {
        heading: "Window full of dots? (the small-client problem)",
        body: "If your session appears shrunken with a border of dots, another (often dead) client is attached from a smaller terminal — tmux sizes to the smallest attached client by default. Fix it now with `tmux attach -d` (detaches the others), or permanently:",
        code: "set -g window-size latest\nsetw -g aggressive-resize on",
      },
    ],
    related: ["new-session", "detach", "list-sessions", "switch-sessions"],
  },
  {
    slug: "detach",
    bindingIds: ["detach"],
    title: "How to detach from a tmux session",
    metaDescription:
      "Detach from tmux with prefix d — everything keeps running in the background. Reattach any time with tmux attach. Detach ≠ quit.",
    tldr: {
      text: "Detach — the session keeps running in the background:",
      keys: "d",
      command: "tmux detach",
    },
    sections: [
      {
        heading: "Detach is not quit",
        body: "Your programs keep running after you detach; closing your terminal or dropping an SSH connection has the same effect (an implicit detach). The session only ends when its last window closes or you kill it. This is the core tmux mental model: the server holds your sessions, terminals merely attach to them.",
      },
      {
        heading: "Detaching other clients",
        body: "`tmux attach -d` detaches everyone else when you attach. `prefix D` lets you pick a specific client to kick — useful when a dead connection is holding your window size hostage.",
      },
    ],
    related: ["attach-session", "exit-tmux", "kill-session"],
  },
  {
    slug: "kill-session",
    title: "How to kill a tmux session",
    metaDescription:
      "Kill a tmux session with tmux kill-session -t name, kill all sessions except the current one with -a, or stop everything with tmux kill-server.",
    tldr: {
      text: "Kill a named session:",
      command: "tmux kill-session -t work",
    },
    sections: [
      {
        heading: "Cleanup patterns",
        body: "`tmux kill-session -a` kills every session except the one you're in — the fastest way to clean up. `tmux kill-server` stops everything, including the tmux server itself. From inside a session, `prefix :` then `kill-session` ends the current one.",
      },
      {
        heading: "Killing ≠ detaching",
        body: "If you just want to leave but keep things running, that's `prefix d` (detach). Kill actually terminates every process in the session.",
      },
    ],
    related: ["detach", "exit-tmux", "list-sessions"],
  },
  {
    slug: "list-sessions",
    title: "How to list tmux sessions",
    metaDescription:
      "List running tmux sessions with tmux ls, browse them interactively with prefix s, and script against the list with custom formats.",
    tldr: {
      text: "List all sessions on the server:",
      command: "tmux ls",
    },
    sections: [
      {
        heading: "The interactive version is better",
        body: "Inside tmux, `prefix s` opens a navigable tree of sessions (expand to see windows, Enter to switch). For scripts, format strings turn the list into clean output: `tmux ls -F '#S'` prints just the names.",
      },
      {
        heading: '"no server running"',
        body: "That error just means nothing is running — the tmux server starts with your first session and exits with the last one. It's not broken; there's simply nothing to list.",
      },
    ],
    related: ["switch-sessions", "attach-session", "new-session"],
  },
  {
    slug: "rename-session",
    bindingIds: ["rename-session"],
    title: "How to rename a tmux session",
    metaDescription:
      "Rename a tmux session with prefix $ from inside, or tmux rename-session -t old new from the shell.",
    tldr: {
      text: "Rename the current session:",
      keys: "$",
      command: "tmux rename-session -t 0 work",
    },
    sections: [
      {
        heading: "Rescue your unnamed sessions",
        body: "If you started with a bare `tmux` and now live in session \"3\", rename it in place: `prefix $`, type a name, Enter. Sessions can be renamed at any time without disturbing anything running inside.",
      },
    ],
    related: ["new-session", "rename-window", "list-sessions"],
  },
  {
    slug: "switch-sessions",
    bindingIds: ["choose-session"],
    title: "How to switch between tmux sessions",
    metaDescription:
      "Switch tmux sessions without detaching: prefix s for the interactive tree, prefix ( and ) to cycle, prefix L to toggle, or a popup fzf switcher.",
    tldr: {
      text: "Pick a session interactively (no need to detach):",
      keys: "s",
      command: "switch-client -t work",
    },
    sections: [
      {
        heading: "You never need to detach-and-reattach",
        body: "`switch-client` moves your terminal between sessions instantly: `prefix (` and `prefix )` cycle, `prefix L` toggles the last two — like `cd -` for workspaces.",
      },
      {
        heading: "The fzf popup switcher",
        body: "The beloved power-user setup — a fuzzy session picker in a floating popup (tmux ≥ 3.2):",
        code: `bind C-j display-popup -E "tmux list-sessions -F '#S' | fzf --reverse | xargs tmux switch-client -t"`,
      },
    ],
    related: ["list-sessions", "new-session", "popup-window"],
  },
  {
    slug: "exit-tmux",
    title: "How to exit tmux",
    metaDescription:
      "Exit tmux the right way: detach with prefix d to keep work running, exit shells to close panes/windows, or kill the session/server to stop everything.",
    tldr: {
      text: "Leave but keep everything running — or actually quit:",
      keys: "d (detach)",
      command: "tmux kill-session   # actually quit this session",
    },
    sections: [
      {
        heading: "Three different \"exits\"",
        body: "Detach (`prefix d`) leaves everything running — you can come back. `exit`/Ctrl-d closes the current pane; do it in the last pane of the last window and the session ends. `tmux kill-server` stops absolutely everything. Most \"how do I exit tmux\" frustration is not knowing which of these you want — usually it's detach.",
      },
      {
        heading: "If you're stuck",
        body: "In copy mode (scrolling)? Press `q`. In a weird full-screen view (clock, tree picker)? Press `q` or Escape. Terminal frozen after Ctrl-s? Press Ctrl-q — that's terminal flow control, not tmux.",
      },
    ],
    related: ["detach", "kill-session", "close-pane"],
  },

  // ── Copy mode / scrolling / clipboard ─────────────────────────────────
  {
    slug: "scroll",
    bindingIds: ["enter-copy-mode"],
    title: "How to scroll in tmux",
    metaDescription:
      "Scroll in tmux with prefix [ then PgUp/arrows, or enable mouse wheel scrolling with set -g mouse on. Raise history-limit for more scrollback.",
    tldr: {
      text: "Enter copy mode to scroll (q to exit), or turn on the mouse wheel:",
      keys: "[ then ↑/PgUp",
      command: "set -g mouse on   # wheel scrolling just works",
    },
    sections: [
      {
        heading: "Why your wheel does nothing",
        body: "tmux keeps its own scrollback per pane and doesn't use your terminal's — so the terminal scrollbar shows nothing and the wheel is dead until you either enter copy mode (`prefix [`) or enable mouse mode. With `mouse on`, the wheel scrolls the pane under the cursor, and scrolling to the bottom drops you back to live output.",
      },
      {
        heading: "Copy-mode scrolling keys",
        body: "Inside copy mode (with vi keys): `C-u`/`C-d` half-page, `C-b`/`C-f` full page, `g`/`G` top/bottom, `/` search. `q` exits. Enable vi keys with `setw -g mode-keys vi`.",
      },
      {
        heading: "Only 2,000 lines? Raise the buffer",
        body: "The default scrollback is small, and the setting only affects new panes:",
        code: "set -g history-limit 50000",
      },
    ],
    related: ["copy-paste", "mouse-mode", "history-limit", "search-scrollback"],
  },
  {
    slug: "copy-paste",
    bindingIds: ["enter-copy-mode", "copy-begin-selection", "copy-copy-selection", "paste-buffer"],
    title: "How to copy and paste in tmux",
    metaDescription:
      "Copy and paste in tmux: enter copy mode with prefix [, select with Space, copy with Enter, paste with prefix ]. Plus system clipboard integration.",
    tldr: {
      text: "Copy mode → select → copy → paste:",
      keys: "[ · Space · Enter · ]",
      command: "setw -g mode-keys vi   # vi-style selection",
    },
    sections: [
      {
        heading: "The keyboard flow",
        body: "`prefix [` enters copy mode. Move to the start of what you want, press Space to start selecting, move to the end, press Enter to copy and exit. `prefix ]` pastes. With vi mode-keys, `v` and `y` can be bound to match vim:",
        code: `setw -g mode-keys vi
bind -T copy-mode-vi v send -X begin-selection
bind -T copy-mode-vi y send -X copy-selection-and-cancel`,
      },
      {
        heading: "The catch: tmux has its own clipboard",
        body: "Copying in tmux lands in a tmux paste buffer, not your system clipboard — `prefix ]` pastes it, but Cmd-V won't see it. Getting them to sync is its own topic: see the system clipboard page for the per-OS setup (it's the #1 tmux complaint of all time).",
      },
      {
        heading: "Buffer history",
        body: "Every copy is kept: `prefix =` opens a picker of all previous copies — a built-in clipboard manager almost nobody knows about.",
      },
    ],
    related: ["copy-to-system-clipboard", "scroll", "mouse-mode", "search-scrollback"],
  },
  {
    slug: "copy-to-system-clipboard",
    title: "How to copy from tmux to the system clipboard",
    metaDescription:
      "Make tmux copy to the real clipboard on macOS, Linux (X11/Wayland), and over SSH with OSC 52 — the definitive per-platform setup.",
    tldr: {
      text: "Modern tmux + a decent terminal — this is usually all you need:",
      command: "set -g set-clipboard on",
    },
    sections: [
      {
        heading: "There are three clipboards. That's the whole problem.",
        body: "Your terminal's selection, tmux's paste buffers, and the OS clipboard are three separate things. `set-clipboard on` bridges them using OSC 52, an escape sequence that asks your terminal to set the OS clipboard — it works in iTerm2, kitty, WezTerm, Alacritty, Ghostty, and Windows Terminal, and crucially it works over SSH, because the sequence travels through the connection to your local terminal.",
      },
      {
        heading: "If OSC 52 doesn't work: pipe to a clipboard tool",
        body: "The traditional fix is piping the copy to your platform's clipboard command:",
        code: `# macOS
bind -T copy-mode-vi y send -X copy-pipe-and-cancel "pbcopy"
# Linux X11
bind -T copy-mode-vi y send -X copy-pipe-and-cancel "xclip -selection clipboard -i"
# Linux Wayland
bind -T copy-mode-vi y send -X copy-pipe-and-cancel "wl-copy"`,
      },
      {
        heading: "Stale advice warning",
        body: "Old guides tell macOS users to install `reattach-to-user-namespace`. That's been unnecessary since tmux 2.6 (2017) — if a tutorial mentions it, the rest of it is probably outdated too. Same for `xsel` incantations wrapped in `if-shell` blocks from 2014.",
      },
      {
        heading: "Mouse selection",
        body: "With `mouse on`, drag-select copies to the tmux buffer and (with `set-clipboard on`) the system clipboard on release. To bypass tmux entirely and use raw terminal selection, hold Shift while dragging.",
      },
    ],
    related: ["copy-paste", "mouse-mode", "scroll"],
  },
  {
    slug: "search-scrollback",
    bindingIds: ["copy-search-backward", "copy-search-next"],
    title: "How to search the scrollback in tmux",
    metaDescription:
      "Search tmux output: prefix [ to enter copy mode, then / to search down and ? to search up, n/N to repeat. Save scrollback with capture-pane.",
    tldr: {
      text: "Enter copy mode, then search like less/vim:",
      keys: "[ then ? (search up) · n / N (repeat)",
      command: "copy-mode",
    },
    sections: [
      {
        heading: "The flow",
        body: "You're almost always looking for something that already scrolled past, so `?` (search upward) is the one to remember. Type the pattern, Enter, then `n` for the next hit and `N` for the previous. Matches are highlighted. `*` searches for the word under the cursor.",
      },
    ],
    related: ["scroll", "capture-pane", "copy-paste"],
  },
  {
    slug: "mouse-mode",
    title: "How to enable mouse mode in tmux",
    metaDescription:
      "Enable tmux mouse support with set -g mouse on: wheel scrolling, click to select panes, drag borders to resize. Plus fixing selection and middle-click paste.",
    tldr: {
      text: "One line — scrolling, pane clicking, and border dragging all work:",
      command: "set -g mouse on",
    },
    sections: [
      {
        heading: "What you get",
        body: "Wheel scrolls the pane under the cursor, clicking focuses a pane, dragging borders resizes, drag-select copies into the tmux buffer, and right-click opens context menus (tmux ≥ 3.0). One old-guide warning: `mode-mouse` / `mouse-select-pane` options are from pre-2.1 tmux — if you see them, the guide is a decade old. It's just `mouse` now.",
      },
      {
        heading: "The selection trade-off",
        body: "With the mouse on, tmux owns selection: copies go to tmux buffers (add `set -g set-clipboard on` to sync the system clipboard), and selection correctly stays inside one pane. Hold Shift to bypass tmux and get raw terminal selection — useful, but it'll grab text across pane borders since the terminal can't see them.",
      },
      {
        heading: "Middle-click paste",
        body: "X11 users: middle-click pastes the tmux buffer by default with mouse on. If you want it to paste the X primary selection instead, that needs a custom binding — search the cheat sheet for paste-buffer.",
      },
    ],
    related: ["scroll", "copy-to-system-clipboard", "resize-pane"],
  },

  // ── Config / misc / power ─────────────────────────────────────────────
  {
    slug: "reload-config",
    title: "How to reload the tmux config",
    metaDescription:
      "Apply .tmux.conf changes without restarting: tmux source ~/.tmux.conf, or bind prefix r to reload. Why removed settings don't reset, and where the file lives.",
    tldr: {
      text: "Re-run your config against the live server:",
      command: "tmux source ~/.tmux.conf",
    },
    sections: [
      {
        heading: "Give yourself a reload key",
        body: "The classic quality-of-life binding — change config, prefix r, done:",
        code: `bind r source-file ~/.tmux.conf \\; display "config reloaded"`,
      },
      {
        heading: "Two gotchas",
        body: "Sourcing re-runs the file; it does not reset state first — if you delete a `set` line, the old value sticks until you unset it or restart the server (`tmux kill-server`). And since tmux 3.1 the config can live at `~/.config/tmux/tmux.conf` — make sure you're editing (and sourcing) the one tmux actually reads.",
      },
    ],
    related: ["command-prompt", "list-keys", "new-session"],
  },
  {
    slug: "command-prompt",
    bindingIds: ["command-prompt"],
    title: "How to use the tmux command prompt",
    metaDescription:
      "Every tmux keybinding is a shortcut for a command. Open the prompt with prefix :, use tab completion, and stop memorizing keys.",
    tldr: {
      text: "Open the prompt — every tmux command lives here:",
      keys: ":",
      command: "command-prompt",
    },
    sections: [
      {
        heading: "The escape hatch from memorization",
        body: "Can't remember the key for something? Type the command: `:split-window -h`, `:rename-window logs`, `:setw synchronize-panes`. Tab completes command names. Everything a keybinding can do, the prompt can do — keys are just shortcuts defined with `bind-key`.",
      },
      {
        heading: "Discoverability trio",
        body: "`prefix ?` lists all keybindings, `prefix /` describes what a single key does, and `tmux list-commands` prints every command with its flags. Between these three, tmux is fully self-documenting.",
      },
    ],
    related: ["list-keys", "reload-config", "send-keys"],
  },
  {
    slug: "list-keys",
    bindingIds: ["list-keys"],
    title: "How to see all tmux keybindings",
    metaDescription:
      "List every tmux keybinding with prefix ? or tmux list-keys -N, and ask what a specific key does with prefix /.",
    tldr: {
      text: "Show all bindings (searchable — it opens in copy mode):",
      keys: "?",
      command: "tmux lsk -N | less",
    },
    sections: [
      {
        heading: "It's searchable",
        body: "The `prefix ?` view is a copy-mode pane: press `/` or `?` and search it like any scrollback. `prefix /` then a key answers \"what does this key do?\" for one key at a time.",
      },
    ],
    related: ["command-prompt", "copy-paste"],
  },
  {
    slug: "send-keys",
    title: "How to script tmux with send-keys",
    metaDescription:
      "Automate tmux with send-keys: type into any pane from a script, build project workspaces, and drive interactive programs — including AI coding agents.",
    tldr: {
      text: "Type a command into a session from outside:",
      command: `tmux send-keys -t work "npm test" Enter`,
    },
    sections: [
      {
        heading: "Targets",
        body: "`-t session:window.pane` addresses any pane precisely: `tmux send-keys -t work:1.2 \"ls\" Enter` types into pane 2 of window 1. `Enter` at the end is the keypress — without it the text just sits at the prompt.",
      },
      {
        heading: "Scripted workspaces",
        body: "Combine with detached sessions to build a full dev environment in a script — the lightweight alternative to tmuxinator:",
        code: `tmux new -d -s dev -n editor
tmux send-keys -t dev:editor "nvim ." Enter
tmux split-window -t dev:editor -h -l 30%
tmux send-keys -t dev:editor.1 "npm run dev" Enter
tmux attach -t dev`,
      },
      {
        heading: "Driving interactive programs",
        body: "send-keys can drive anything that reads a terminal — REPLs, TUIs, and lately AI coding agents running in parallel panes. Pair with `capture-pane -p` to read the output back in a script.",
      },
    ],
    related: ["capture-pane", "synchronize-panes", "new-session"],
  },
  {
    slug: "capture-pane",
    title: "How to save tmux scrollback to a file",
    metaDescription:
      "Dump tmux pane output with capture-pane, save the entire scrollback to a file, or log everything continuously with pipe-pane.",
    tldr: {
      text: "Save the whole scrollback of the current pane:",
      command: "tmux capture-pane -p -S - > output.txt",
    },
    sections: [
      {
        heading: "The flags",
        body: "`-p` prints to stdout, `-S -` starts from the very beginning of history (default is just the visible screen), `-E` sets an end line. `-t` targets any pane. `-J` joins wrapped lines back together.",
      },
      {
        heading: "Continuous logging",
        body: "`pipe-pane` streams everything that appears in a pane to a command, toggling on repeat invocations:",
        code: `bind P pipe-pane -o "cat >> ~/tmux-#W.log" \\; display "toggled logging"`,
      },
    ],
    related: ["send-keys", "scroll", "history-limit"],
  },
  {
    slug: "history-limit",
    title: "How to increase the scrollback buffer in tmux",
    metaDescription:
      "Raise tmux scrollback with set -g history-limit 50000. Why it only affects new panes, and the memory trade-off to know about.",
    tldr: {
      text: "More scrollback (takes effect for new panes only):",
      command: "set -g history-limit 50000",
    },
    sections: [
      {
        heading: "The gotcha everyone hits",
        body: "history-limit is read when a pane is created — setting it does nothing for panes that already exist. Put it in .tmux.conf, restart or open new panes, done. This detail is the accepted answer on the single most-viewed tmux question on Stack Overflow.",
      },
      {
        heading: "Don't set it to a million",
        body: "Scrollback is kept in RAM per pane; 50k lines is a sane ceiling for heavy use. If you need everything forever, log with `pipe-pane` to a file instead.",
      },
    ],
    related: ["scroll", "capture-pane"],
  },
  {
    slug: "nested-tmux",
    bindingIds: ["send-prefix"],
    title: "How to use tmux inside tmux (nested sessions)",
    metaDescription:
      "Run tmux over SSH inside local tmux: send the prefix twice to control the inner session, or set up a keybinding toggle to switch control.",
    tldr: {
      text: "Press the prefix twice to send it to the inner tmux:",
      keys: "C-b C-b <key>",
      command: "send-prefix",
    },
    sections: [
      {
        heading: "The situation",
        body: "You run tmux locally, SSH somewhere, and attach to tmux there. Now `C-b c` opens a window in your local session — the outer tmux eats the prefix. `C-b C-b c` passes it through to the remote one.",
      },
      {
        heading: "Nicer: different prefixes, or an off switch",
        body: "Set the remote tmux to a different prefix (e.g. `C-a`) so the two never collide. Or add an F12 \"off mode\" to your local config that temporarily disables all local keybindings while you work in the inner session — search for \"tmux F12 nested\" for the full recipe from Sam Oehlert's dotfiles, or start from:",
        code: `# on the REMOTE machine's tmux.conf
set -g prefix C-a
unbind C-b
bind C-a send-prefix`,
      },
      {
        heading: '"sessions should be nested with care"',
        body: "That error means you ran `tmux new`/`attach` inside tmux on the same machine. You rarely want that — use `switch-client` (`prefix s`) to move between local sessions instead. To force real nesting: `unset TMUX` first (and know why you're doing it).",
      },
    ],
    related: ["send-keys", "switch-sessions", "attach-session"],
  },
  {
    slug: "move-process-into-tmux",
    title: "How to move a running process into tmux",
    metaDescription:
      "Started a long job outside tmux? Use reptyr to steal it into a tmux pane, or Ctrl-Z + bg + disown to keep it alive — and start in tmux next time.",
    tldr: {
      text: "Steal a running process into the current pane (Linux):",
      command: "reptyr <pid>",
    },
    sections: [
      {
        heading: "reptyr",
        body: "`reptyr` reattaches a process to your current terminal. Suspend the process's control (`Ctrl-Z; bg; disown` in its original shell), then in tmux run `reptyr PID`. On many distros you'll need `sudo sysctl kernel.yama.ptrace_scope=0` first. macOS: no reliable equivalent — dtrace-based tricks exist but are fragile.",
      },
      {
        heading: "The honest answer",
        body: "This is a rescue maneuver, not a workflow. If a job might outlive your terminal, start it in tmux (or at least with `nohup`/`setsid`). `tmux new -As main` as a login habit makes \"oops, wrong terminal\" impossible.",
      },
    ],
    related: ["new-session", "detach", "attach-session"],
  },
  {
    slug: "save-restore-sessions",
    title: "How to save and restore tmux sessions across reboots",
    metaDescription:
      "tmux sessions die on reboot. Restore layouts with tmux-resurrect and continuum, or script your workspace so it rebuilds deterministically.",
    tldr: {
      text: "Install the plugins that persist sessions across restarts:",
      command: "set -g @plugin 'tmux-plugins/tmux-resurrect'",
    },
    sections: [
      {
        heading: "What survives what",
        body: "Detaching survives anything short of a reboot — sessions live in the tmux server process. A reboot kills the server and everything in it; tmux has no built-in persistence. tmux-resurrect saves sessions/windows/panes/paths (prefix Ctrl-s to save, Ctrl-r to restore), and tmux-continuum automates it:",
        code: `set -g @plugin 'tmux-plugins/tmux-resurrect'
set -g @plugin 'tmux-plugins/tmux-continuum'
set -g @continuum-restore 'on'`,
      },
      {
        heading: "Set expectations",
        body: "Resurrect restores layout and directories, not running state — your vim session, REPL history, and half-finished processes don't come back (vim/neovim session restore exists via an extra setting, imperfectly). Long-running programs must be restarted.",
      },
      {
        heading: "The scriptable alternative",
        body: "A 10-line script that rebuilds your workspace (`new-session -d`, `split-window`, `send-keys`) is deterministic, versionable, and never corrupts. Many long-time users prefer it — see the send-keys page for a template. Tools like tmuxinator, tmuxp, and sesh formalize the same idea.",
      },
    ],
    related: ["send-keys", "new-session", "detach"],
  },
];
