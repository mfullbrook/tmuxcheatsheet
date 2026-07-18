import type { CommandPage } from "./command-page-types";

export const PANE_WINDOW_PAGES: CommandPage[] = [
  {
    slug: "split-pane",
    bindingIds: ["split-pane-right", "split-pane-down"],
    title: "How to split a pane in tmux",
    metaDescription:
      "Split a tmux window into panes: prefix % for side-by-side, prefix \" for stacked. Plus how to rebind to | and -, and split in the current directory.",
    tldr: {
      text: "Side-by-side split, or stacked split:",
      keys: '% (left/right) · " (top/bottom)',
      command: "split-window -h   # or -v",
    },
    sections: [
      {
        heading: "Why the default keys feel backwards",
        body: 'tmux calls `split-window -h` a "horizontal split" because the dividing line runs top-to-bottom — but your panes end up side by side, which most people call a vertical split. Don\'t fight it: think in results. `%` looks like two things side by side; `"` looks like two marks stacked.',
      },
      {
        heading: "Rebind to | and - (what almost everyone does)",
        body: "The most popular rebind in any .tmux.conf — the symbols look like the split they create, and adding `-c '#{pane_current_path}'` makes new panes open in your current directory instead of your home directory:",
        code: `bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"`,
      },
      {
        heading: "Control the size at split time",
        body: "`-l` takes a size in cells or a percentage: `split-window -h -l 30%` gives the new pane 30% of the width. `-b` puts the new pane before (left/above) the current one.",
      },
    ],
    related: ["close-pane", "zoom-pane", "resize-pane", "switch-panes"],
  },
  {
    slug: "switch-panes",
    bindingIds: ["select-pane-arrows", "display-panes"],
    title: "How to switch between panes in tmux",
    metaDescription:
      "Move between tmux panes with prefix + arrow keys, jump by number with prefix q, or set up Alt+arrow and vim-style navigation without the prefix.",
    tldr: {
      text: "Move to the pane in a direction, or pick by number:",
      keys: "↑ ↓ ← → · q (shows numbers, press one)",
      command: "select-pane -U / -D / -L / -R",
    },
    sections: [
      {
        heading: "Faster: skip the prefix entirely",
        body: "Prefix + arrow gets old fast. Bind Alt+arrow (`-n` means no prefix needed) and switching panes becomes one keystroke:",
        code: `bind -n M-Left select-pane -L
bind -n M-Right select-pane -R
bind -n M-Up select-pane -U
bind -n M-Down select-pane -D`,
      },
      {
        heading: "Other ways to jump",
        body: "`prefix q` flashes a number on each pane — press the number to jump. `prefix ;` toggles between your two most recent panes. `prefix o` cycles through panes in order. If you live in vim/neovim, use the vim-tmux-navigator plugin so Ctrl-h/j/k/l moves seamlessly across vim splits and tmux panes.",
      },
    ],
    conf: `# vim-style pane navigation with prefix
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R`,
    related: ["split-pane", "zoom-pane", "swap-panes"],
  },
  {
    slug: "resize-pane",
    bindingIds: ["resize-pane-coarse", "resize-pane-fine"],
    title: "How to resize a pane in tmux",
    metaDescription:
      "Resize tmux panes with prefix + Ctrl/Alt arrows, exact sizes with resize-pane -x/-y, drag borders with the mouse, or snap to a preset layout.",
    tldr: {
      text: "Hold the prefix, then Alt+arrow resizes in steps of 5, Ctrl+arrow by 1:",
      keys: "M-↑/↓/←/→ (by 5) · C-↑/↓/←/→ (by 1)",
      command: "resize-pane -D 10   # also -U -L -R, or -x 80 / -y 20",
    },
    sections: [
      {
        heading: "These bindings repeat",
        body: "Resize keys are bound with the repeat flag: press the prefix once, then keep tapping the arrow within `repeat-time` (500ms default) — no need to re-press the prefix for every step.",
      },
      {
        heading: "The easy ways",
        body: "With `set -g mouse on` you can simply drag pane borders. `prefix z` zooms a pane to full size, which is usually what you actually wanted. And `resize-pane -x 50%` sets an exact width when you know the proportions you want.",
      },
      {
        heading: "Or stop resizing manually",
        body: "`prefix Space` cycles preset layouts (even columns, even rows, main + others, tiled) and `select-layout -E` spreads panes out evenly — often faster than nudging borders.",
      },
    ],
    related: ["zoom-pane", "split-pane", "swap-panes"],
  },
  {
    slug: "zoom-pane",
    bindingIds: ["zoom-pane"],
    title: "How to zoom (maximize) a pane in tmux",
    metaDescription:
      "Toggle a tmux pane to full screen with prefix z. The layout is preserved and restored when you zoom back out.",
    tldr: {
      text: "Toggle the current pane full-window (press again to restore):",
      keys: "z",
      command: "resize-pane -Z",
    },
    sections: [
      {
        heading: "How to tell you're zoomed",
        body: "The window name in the status bar gets a `Z` suffix (like `1:logs*Z`). If your panes ever seem to have \"disappeared\", check for that Z — you're zoomed in on one of them. Your layout comes back exactly as it was when you unzoom.",
      },
      {
        heading: "Things that play nicely with zoom",
        body: "Switching to another pane while zoomed automatically unzooms first. It's perfect for temporarily going full-screen on vim or a log tail without giving up your split layout.",
      },
    ],
    related: ["resize-pane", "switch-panes", "split-pane"],
  },
  {
    slug: "swap-panes",
    bindingIds: ["swap-pane-up", "swap-pane-down"],
    title: "How to swap and rearrange panes in tmux",
    metaDescription:
      "Swap tmux panes with prefix { and }, rotate them all with Ctrl-o, or use swap-pane with marks to move panes precisely between positions.",
    tldr: {
      text: "Swap the current pane with the previous or next one:",
      keys: "{ (previous) · } (next)",
      command: "swap-pane -U   # or -D",
    },
    sections: [
      {
        heading: "Precise swaps with a mark",
        body: "Mark the first pane with `prefix m`, move to the other pane, then run `swap-pane` from the command prompt (`prefix :`) — the current pane and marked pane trade places. Works across windows.",
      },
      {
        heading: "Rearranging everything",
        body: "`prefix C-o` rotates every pane one position around the layout. `prefix Space` cycles preset layouts, which often beats manual rearranging when things get messy.",
      },
    ],
    related: ["switch-panes", "break-pane", "join-pane"],
  },
  {
    slug: "close-pane",
    bindingIds: ["kill-pane"],
    title: "How to close a pane in tmux",
    metaDescription:
      "Close a tmux pane by exiting its shell (exit or Ctrl-d), or force-kill it with prefix x. Closing the last pane closes the window.",
    tldr: {
      text: "Exit the shell, or force-kill a stuck pane:",
      keys: "x (confirms with y/n)",
      command: "exit   # or Ctrl-d — the normal way",
    },
    sections: [
      {
        heading: "exit vs. kill",
        body: "A pane lives as long as the process inside it. Type `exit` or press Ctrl-d and the pane closes cleanly. `prefix x` (kill-pane) is for when the process is stuck. When the last pane in a window closes, the window closes; when the last window closes, the session ends.",
      },
      {
        heading: "Keep panes open after the command exits",
        body: "If a pane closes before you can read the output, `set -g remain-on-exit on` keeps dead panes visible; restart the program in one with `respawn-pane -k`.",
      },
    ],
    related: ["kill-window", "exit-tmux", "split-pane"],
  },
  {
    slug: "break-pane",
    bindingIds: ["break-pane"],
    title: "How to move a pane to its own window in tmux",
    metaDescription:
      "Break a tmux pane out into a new window with prefix !, and pull it back with join-pane. Move panes between windows precisely with marks.",
    tldr: {
      text: "Break the current pane out into its own window:",
      keys: "!",
      command: "break-pane",
    },
    sections: [
      {
        heading: "The reverse: join-pane",
        body: "`join-pane -s :2` pulls window 2 into the current window as a pane (add `-h` for side-by-side). Or mark a pane with `prefix m`, go to the destination window, and run `join-pane` bare — the marked pane moves to you.",
      },
    ],
    related: ["join-pane", "swap-panes", "new-window"],
  },
  {
    slug: "join-pane",
    title: "How to merge a window into a pane in tmux (join-pane)",
    metaDescription:
      "Use tmux join-pane to pull another window in as a pane of the current window — the reverse of break-pane. With -h for horizontal joins.",
    tldr: {
      text: "Pull window 2 into this window as a new pane:",
      command: "join-pane -s :2   # -h for side-by-side",
    },
    sections: [
      {
        heading: "Targeting",
        body: "`-s` is the source (what moves), `-t` the destination. Targets look like `session:window.pane` — `join-pane -s work:1.0 -t 2` moves pane 0 of window 1 in session \"work\" into window 2 here. The mark workflow is easier: `prefix m` on the source pane, then run `join-pane` in the destination window.",
      },
    ],
    related: ["break-pane", "swap-panes", "move-window"],
  },
  {
    slug: "synchronize-panes",
    title: "How to type in all panes at once in tmux",
    metaDescription:
      "Turn on tmux synchronize-panes to send your keystrokes to every pane in the window — run the same commands on multiple servers simultaneously.",
    tldr: {
      text: "Toggle sending input to every pane in the window:",
      command: "setw synchronize-panes",
    },
    sections: [
      {
        heading: "The classic multi-server workflow",
        body: "Split a window into one pane per server, SSH into each, then turn on synchronize-panes — every keystroke now goes to all of them. Run it again (or `setw synchronize-panes off`) to stop. Bind it for quick toggling:",
        code: "bind S setw synchronize-panes",
      },
      {
        heading: "Know when it's on",
        body: "It's easy to forget it's enabled and type somewhere destructive. Show it in your status bar: `#{?pane_synchronized,SYNC ,}` renders a SYNC flag only while active.",
      },
    ],
    related: ["split-pane", "send-keys", "switch-panes"],
  },
  {
    slug: "popup-window",
    title: "How to open a floating popup window in tmux",
    metaDescription:
      "Use tmux display-popup (tmux 3.2+) to run commands in a floating window over your panes — perfect for fzf, lazygit, or a scratch terminal.",
    tldr: {
      text: "Run any command in a floating window over your panes (tmux ≥ 3.2):",
      command: "display-popup -E lazygit",
    },
    sections: [
      {
        heading: "The flags that matter",
        body: "`-E` closes the popup when the command exits. `-w` and `-h` set size (`-w 90% -h 90%`), `-d` sets the working directory. Without a command you get an interactive shell in the popup.",
      },
      {
        heading: "Popular popup bindings",
        body: "Floating scratch terminal, lazygit, and a session switcher — this is the feature most \"is tmux still good?\" people don't know exists:",
        code: `bind g display-popup -E -w 90% -h 90% lazygit
bind C-t display-popup -E -w 80% -h 75%
bind C-j display-popup -E "tmux ls -F '#S' | fzf | xargs tmux switch-client -t"`,
      },
      {
        heading: "Version note",
        body: "Popups arrived in tmux 3.2 (2021). If `display-popup` errors with \"unknown command\", check `tmux -V` — Ubuntu LTS ships old versions; install from source or a PPA.",
      },
    ],
    related: ["command-prompt", "switch-sessions", "send-keys"],
  },
  {
    slug: "new-window",
    bindingIds: ["new-window"],
    title: "How to create a new window in tmux",
    metaDescription:
      "Create a tmux window (tab) with prefix c, name it at creation, open it in the current directory, and control where it lands in the window list.",
    tldr: {
      text: "New window (like a browser tab), switches to it:",
      keys: "c",
      command: "new-window   # neww for short",
    },
    sections: [
      {
        heading: "Open in the current directory",
        body: "By default new windows start in the directory where the session was created. Most people want the directory they're in now:",
        code: `bind c new-window -c "#{pane_current_path}"`,
      },
      {
        heading: "Name it up front",
        body: "`new-window -n logs` creates it pre-named. From a shell: `tmux neww -n logs 'journalctl -f'` — starts the command directly, and the window closes when it exits.",
      },
    ],
    related: ["rename-window", "switch-windows", "kill-window"],
  },
  {
    slug: "rename-window",
    bindingIds: ["rename-window"],
    title: "How to rename a window in tmux",
    metaDescription:
      "Rename a tmux window with prefix , — and stop tmux from renaming it back with automatic-rename. Plus renaming from the shell and scripts.",
    tldr: {
      text: "Rename the current window:",
      keys: ",",
      command: "rename-window newname",
    },
    sections: [
      {
        heading: "Why your name keeps changing back",
        body: "tmux renames windows to the running program unless told otherwise. Renaming a window manually turns automatic renaming off for that window; to stop it globally:",
        code: `set -g automatic-rename off
set -g allow-rename off   # stop programs renaming via escape sequences`,
      },
      {
        heading: "Panes are different",
        body: "Panes don't have names like windows do — they have titles (`select-pane -T title`), which show in the pane border if you enable `pane-border-status`.",
      },
    ],
    related: ["new-window", "rename-session", "switch-windows"],
  },
  {
    slug: "switch-windows",
    bindingIds: ["next-window", "previous-window", "last-window", "select-window-index"],
    title: "How to switch between windows in tmux",
    metaDescription:
      "Move between tmux windows with prefix n/p, jump by number, toggle the last window with prefix l, or pick from an interactive list with prefix w.",
    tldr: {
      text: "Next / previous / by number / last-used:",
      keys: "n · p · 0–9 · l",
      command: "select-window -t :=2",
    },
    sections: [
      {
        heading: "The two you should actually use",
        body: "`prefix l` toggles between your two most recent windows — the alt-tab of tmux. `prefix w` opens an interactive picker with live previews of every window in every session. Between them you rarely need window numbers at all.",
      },
      {
        heading: "No-prefix switching",
        body: "Alt+number is a popular one-keystroke setup:",
        code: `bind -n M-1 select-window -t 1
bind -n M-2 select-window -t 2
bind -n M-3 select-window -t 3`,
      },
    ],
    related: ["new-window", "move-window", "switch-sessions"],
  },
  {
    slug: "move-window",
    bindingIds: ["move-window"],
    title: "How to move and reorder windows in tmux",
    metaDescription:
      "Reorder tmux windows with swap-window, move them to specific indexes with prefix . , and renumber to close gaps with move-window -r.",
    tldr: {
      text: "Move the current window to index 2, or swap two windows:",
      command: "move-window -t 2   ·   swap-window -s 3 -t 1",
    },
    sections: [
      {
        heading: "Close the gaps",
        body: "After killing windows you're left with 0, 1, 4, 7. `move-window -r` renumbers everything sequentially, and this setting does it automatically forever:",
        code: "set -g renumber-windows on",
      },
      {
        heading: "Drag-style reordering",
        body: "Bind Shift+arrow to bubble the current window left or right:",
        code: `bind -r "<" swap-window -d -t -1
bind -r ">" swap-window -d -t +1`,
      },
    ],
    related: ["switch-windows", "rename-window", "kill-window"],
  },
  {
    slug: "kill-window",
    bindingIds: ["kill-window"],
    title: "How to close a window in tmux",
    metaDescription:
      "Close a tmux window by exiting its last pane, or force-kill it with prefix &. Kill every other window with kill-window -a.",
    tldr: {
      text: "Force-close the current window (confirms first):",
      keys: "&",
      command: "kill-window",
    },
    sections: [
      {
        heading: "Usually you don't need it",
        body: "Exiting the last shell in a window (`exit` / Ctrl-d) closes the window cleanly. `prefix &` is the sledgehammer for stuck processes. `kill-window -a` kills every window except the current one — great for cleaning up a messy session.",
      },
    ],
    related: ["close-pane", "kill-session", "new-window"],
  },
];
