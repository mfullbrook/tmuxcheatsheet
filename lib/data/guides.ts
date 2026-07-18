export interface Guide {
  slug: string;
  title: string;
  metaDescription: string;
  hook: string;
  sections: Array<{ heading: string; body: string; code?: string; codeLabel?: string }>;
}

export const GUIDES: Guide[] = [
  {
    slug: "sane-tmux-config",
    title: "The sane tmux config, explained line by line",
    metaDescription:
      "A 20-line .tmux.conf that fixes tmux's hostile defaults — mouse, scrollback, true color, vim lag, split keys — with the reasoning behind every line.",
    hook: "Every tmux thread ends the same way: someone posts a 400-line config, someone else says the defaults are fine, and a third person quietly links the same ten fixes everyone actually uses. These are those fixes — each line with its why, so you own your config instead of cargo-culting it.",
    sections: [
      {
        heading: "The whole thing",
        body: "Copy this, read the rest of the page to understand it, delete what you disagree with:",
        code: `# terminal & colors — see the colors guide for the deep dive
set -g default-terminal "tmux-256color"
set -ga terminal-features ",*:RGB"

# behavior
set -g mouse on               # wheel, click-to-focus, drag borders
set -g history-limit 50000    # default scrollback is tiny
set -g escape-time 10         # kill the Esc lag in vim
set -g focus-events on        # let vim/nvim see focus changes
set -g set-clipboard on       # copies reach the OS clipboard (OSC 52)

# numbering that matches your keyboard
set -g base-index 1
setw -g pane-base-index 1
set -g renumber-windows on

# keys that make sense
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
bind c new-window -c "#{pane_current_path}"
bind r source-file ~/.tmux.conf \\; display "reloaded"

# vi copy mode: v selects, y copies, like god intended
setw -g mode-keys vi
bind -T copy-mode-vi v send -X begin-selection
bind -T copy-mode-vi y send -X copy-selection-and-cancel`,
        codeLabel: "~/.tmux.conf",
      },
      {
        heading: "The two terminal lines (the ones people get wrong)",
        body: "`default-terminal` tells programs *inside* tmux what they're running in — it must be a `tmux-*` or `screen-*` value, and `tmux-256color` enables italics and modern features where plain `screen-256color` doesn't. `terminal-features \",*:RGB\"` tells tmux the *outer* terminal can do 24-bit color. Miss either and your editor theme looks washed out — this pair is the answer to the two most-viewed tmux questions on Stack Exchange.",
      },
      {
        heading: "escape-time: the vim-feel fix",
        body: "tmux waits 500ms by default after Esc to see if it's the start of an escape sequence. vim users feel that as mode-switch lag every few seconds, forever. `10` is effectively instant and safe on any modern setup; neovim's `:checkhealth` explicitly asks for ≤ 300.",
      },
      {
        heading: "The split keys",
        body: "`%` and `\"` are the most-mocked defaults in tmux. `|` and `-` are pictograms of what they create. The `-c '#{pane_current_path}'` part matters more than the keys: without it, new panes open in the directory where the session started, which is never where you are now.",
      },
      {
        heading: "What deliberately isn't here",
        body: "No prefix remap (`C-b` is fine for most people, and default muscle memory works on every server you'll ever SSH into — remap to `C-a` or `C-Space` only once you know you want it). No theme (looks are personal; the status bar section of the generator has a quiet baseline). No plugins (add tmux-resurrect when you know you need reboot persistence, not before). A config you fully understand beats an impressive one.",
      },
      {
        heading: "Reload and verify",
        body: "Apply with `tmux source ~/.tmux.conf` (or your new `prefix r`). Two verification tricks worth knowing: `tmux info | grep -i rgb` confirms true color registered, and if something misbehaves, `tmux -f /dev/null` starts a totally clean instance for comparison — the fastest way to prove whether your config or your terminal is at fault.",
      },
    ],
  },
  {
    slug: "tmux-colors",
    title: "Why your colors look wrong in tmux",
    metaDescription:
      "Fix wrong/washed-out colors in tmux: the $TERM decision tree, default-terminal vs terminal-features, true color (RGB) setup, and vim/neovim theme fixes.",
    hook: "Your editor theme is beautiful in a bare terminal and looks like a 1998 xterm inside tmux. This is the most-cargo-culted problem in the ecosystem — here's the actual mechanism, then the three lines that fix it.",
    sections: [
      {
        heading: "The mechanism (30 seconds)",
        body: "Terminals advertise their capabilities through `$TERM`. tmux sits in the middle: to the programs inside it, *tmux* is the terminal (so `$TERM` inside must be tmux's own value); to your real terminal, tmux is just a program (so tmux needs to know what the outer terminal can do). Colors break when either side of that handshake is wrong.",
      },
      {
        heading: "The fix",
        body: "Two lines in .tmux.conf cover both directions:",
        code: `set -g default-terminal "tmux-256color"   # inside: what programs see
set -ga terminal-features ",*:RGB"        # outside: outer terminal does 24-bit`,
        codeLabel: "~/.tmux.conf",
      },
      {
        heading: "Verify it worked",
        body: "Restart tmux fully (`tmux kill-server` — sourcing isn't enough for `default-terminal`), then: `echo $TERM` inside should print `tmux-256color`, and this gradient should be smooth, not stepped:",
        code: `awk 'BEGIN{for(i=0;i<77;i++){r=255-i*3;printf "\\033[48;2;%d;%d;%dm ",r,i*3,i*2}print "\\033[0m"}'`,
        codeLabel: "true-color test — run inside tmux",
      },
      {
        heading: "The decision tree when it still fails",
        body: "1) `echo $TERM` *outside* tmux — if it's not what your terminal ships (e.g. `xterm-256color`, `xterm-kitty`), your shell config is overriding it; stop doing that. 2) `echo $TERM` *inside* — if it isn't `tmux-256color`, your `default-terminal` line isn't being read (wrong config path? tmux ≥ 3.1 also reads `~/.config/tmux/tmux.conf`). 3) `tmux info | grep -iE 'RGB|Tc'` — no match means the `terminal-features` line didn't apply to your outer $TERM; the `,*:RGB` wildcard form above applies to all of them. 4) vim/neovim specifically: `set termguicolors` (vim also needs `t_8f`/`t_8b` overrides; neovim doesn't).",
      },
      {
        heading: "Stale advice to ignore",
        body: "`set -g default-terminal \"screen-256color\"` (loses italics and features — from the pre-tmux-terminfo era). `terminal-overrides ',*256col*:colors=256'` alone (256 indexed colors is not true color). Anything mentioning `Tc` still works as the older spelling of RGB but if the guide says `Tc`, check its date. And if a Mac guide mentions installing ncurses to get tmux-256color terminfo — that one's actually still occasionally true on old macOS versions, which is why `tmux info` verification beats faith.",
      },
    ],
  },
  {
    slug: "tmux-and-neovim",
    title: "tmux + neovim: fix every :checkhealth warning",
    metaDescription:
      "Make tmux and neovim work perfectly together: escape-time, focus-events, true color RGB, undercurl, seamless split navigation, and clipboard.",
    hook: "Run :checkhealth in neovim inside tmux on a default setup and you get a wall of warnings. Every one of them is real, every one has a one-line fix, and this page is all of them in one place.",
    sections: [
      {
        heading: "The four config lines checkhealth wants",
        body: "These resolve the standard warnings — Esc lag, autoread not firing, wrong $TERM, and no true color:",
        code: `set -sg escape-time 10
set -g focus-events on
set -g default-terminal "tmux-256color"
set -ga terminal-features ",*:RGB"`,
        codeLabel: "~/.tmux.conf",
      },
      {
        heading: "What each one actually fixes",
        body: "`escape-time`: tmux holds Esc for 500ms by default deciding if it's an escape sequence — that's the mode-switch lag you feel. `focus-events`: without it, neovim never hears FocusGained/FocusLost, so `autoread` doesn't refresh files changed by another pane (your test runner, a formatter, git). The terminal pair: see the colors guide for the mechanism — inside neovim, also `:set termguicolors`.",
      },
      {
        heading: "Seamless split navigation",
        body: "The dream: `C-h/j/k/l` moves between neovim splits and tmux panes as if they were one system. vim-tmux-navigator does exactly this (install the plugin in neovim, paste its tmux-side bindings into .tmux.conf). If you use lazy.nvim:",
        code: `{ "christoomey/vim-tmux-navigator",
  cmd = { "TmuxNavigateLeft", "TmuxNavigateDown",
          "TmuxNavigateUp", "TmuxNavigateRight" },
  keys = {
    { "<c-h>", "<cmd>TmuxNavigateLeft<cr>" },
    { "<c-j>", "<cmd>TmuxNavigateDown<cr>" },
    { "<c-k>", "<cmd>TmuxNavigateUp<cr>" },
    { "<c-l>", "<cmd>TmuxNavigateRight<cr>" },
  } }`,
        codeLabel: "lazy.nvim plugin spec",
      },
      {
        heading: "Undercurl (squiggly underlines)",
        body: "LSP diagnostics draw as plain underlines instead of squiggles inside tmux unless you declare the capability:",
        code: `set -ga terminal-features ",*:usstyle"`,
        codeLabel: "~/.tmux.conf",
      },
      {
        heading: "Clipboard",
        body: "`set -g set-clipboard on` in tmux plus a normal neovim clipboard setup (`vim.o.clipboard = 'unnamedplus'`) covers local and SSH use in modern terminals. If yanks aren't reaching the system clipboard over SSH, your terminal's OSC 52 support is the suspect — see the system clipboard page for the per-terminal story.",
      },
      {
        heading: "The philosophical question",
        body: "\"Why not just use neovim's own :terminal and splits?\" Fair — until you need detach/reattach over SSH, or a pane that survives neovim restarting. The honest split: neovim owns editing layout, tmux owns processes and persistence. The navigator plugin makes the boundary invisible, which is why this combination remains the default stack for terminal-first development.",
      },
    ],
  },
  {
    slug: "tmux-vs-zellij",
    title: "tmux vs zellij (and wezterm, and shpool): an honest comparison",
    metaDescription:
      "Should you use tmux or zellij? Or just wezterm/kitty splits? An honest comparison of discoverability, defaults, persistence, scripting, and ubiquity.",
    hook: "Zellij's pitch is real: discoverable keybindings on screen, sane defaults, no config required. So why does this site exist for tmux anyway? Because the answer depends on which of four things you actually need — here's the honest matrix.",
    sections: [
      {
        heading: "What zellij genuinely does better",
        body: "Out-of-box experience, by a mile. The status bar shows available keys contextually, so you never google \"how do I split\"; defaults include mouse support and sane scrollback; floating panes and layouts are first-class. If tmux's learning curve is the reason you don't multiplex, zellij removes it. It's good software.",
      },
      {
        heading: "What pulls people back to tmux",
        body: "Four things, per every \"I switched back\" post: ubiquity (tmux is a 1MB-ish install on every distro and already on most servers; muscle memory works everywhere), scripting (`send-keys`, `capture-pane`, format strings — zellij's CLI actions are younger and thinner), ecosystem (resurrect, fzf integrations, sessionizers, a decade of answers), and resource footprint. The keybinding-collision problem zellij spent releases fixing simply doesn't exist in tmux's prefix model — one key is sacrificed, everything else passes through.",
      },
      {
        heading: "The terminal-native option",
        body: "kitty, WezTerm, Ghostty, and iTerm2 all do splits and tabs natively with perfect scrollback, native copy-paste, and zero latency overhead — locally, that's genuinely nicer. What they can't do: survive SSH disconnects (the session lives in the GUI process), attach from a different machine, or run on the server itself. If you never SSH anywhere and never need a session to outlive its window, you may not need a multiplexer at all.",
      },
      {
        heading: "Special mention: shpool and mosh",
        body: "If persistence is the *only* thing you want — no splits, no windows — Google's shpool gives you detach/reattach with native terminal scrolling, and mosh solves flaky connections (roaming, laptop sleep) at the transport layer. mosh + tmux is a classic pairing: mosh keeps the pipe alive, tmux keeps the sessions.",
      },
      {
        heading: "The actual recommendation",
        body: "Work on remote servers or need sessions that outlive terminals → tmux; the 20-line sane config erases most of its default hostility, and it's the skill that transfers everywhere. Local-only and allergic to configuration → zellij, or honestly just your terminal's splits. Building automation around terminal sessions (CI, agents, scripted workspaces) → tmux, nothing else is close. And whichever you pick: the concepts (sessions, panes, detach) transfer — none of this learning is wasted.",
      },
    ],
  },
  {
    slug: "tmux-for-ai-agents",
    title: "Running AI coding agents in tmux",
    metaDescription:
      "Use tmux to run Claude Code and other AI coding agents: parallel agents in panes, send-keys automation, capture-pane monitoring, and detached long-running sessions.",
    hook: "tmux quietly became the standard harness for terminal AI agents: it's how you run five coding agents in parallel, keep them alive after you close your laptop, and script interactions with them. The 50-year-old Unix answer to a 2026 problem.",
    sections: [
      {
        heading: "Why tmux fits agents so well",
        body: "An agent session is a long-running interactive terminal process — exactly what tmux manages. Sessions give each agent a persistent home that survives disconnects; panes give you a mission-control view of several at once; `send-keys` and `capture-pane` give scripts (or an orchestrating agent) hands and eyes on any of them.",
      },
      {
        heading: "The parallel-agents layout",
        body: "One window per task, or a tiled window of agent panes you can watch at once:",
        code: `tmux new -d -s agents -n fix-auth
tmux send-keys -t agents:fix-auth "claude" Enter
tmux new-window -t agents -n add-tests
tmux send-keys -t agents:add-tests "claude" Enter
tmux new-window -t agents -n refactor
tmux send-keys -t agents:refactor "claude" Enter
tmux attach -t agents   # prefix w shows all three, with previews`,
        codeLabel: "shell",
      },
      {
        heading: "Pair with git worktrees",
        body: "Parallel agents in one repo trample each other's changes. The standard pattern is one git worktree per agent — same repo, isolated working directories — with each tmux window `cd`'d into its own worktree. Window name = branch name and the mapping stays legible.",
      },
      {
        heading: "Scripting the loop",
        body: "`send-keys` types into an agent; `capture-pane -p` reads what it said — enough to build watchdogs, auto-approvers, or a supervisor that round-robins between agents:",
        code: `# check on an agent
tmux capture-pane -t agents:fix-auth -p | tail -20
# nudge it
tmux send-keys -t agents:fix-auth "continue, and run the tests" Enter`,
        codeLabel: "shell",
      },
      {
        heading: "Quality-of-life for agent-watching",
        body: "`setw -g monitor-activity on` + `set -g visual-activity on` flags windows where an agent produced output while you were elsewhere. `prefix z` zooms one agent full-screen. A popup (`display-popup -E`) gives you a scratch terminal over the top without disturbing the grid. And because it's all detached-safe, closing your laptop mid-run costs nothing.",
      },
    ],
  },
];
