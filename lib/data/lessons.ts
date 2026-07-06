export interface Lesson {
  slug: string;
  num: number;
  title: string;
  metaDescription: string;
  intro: string;
  sections: Array<{ heading: string; body: string; code?: string; codeLabel?: string }>;
  /** Concrete things to do in a real terminal before moving on. */
  practice: string[];
}

export const LESSONS: Lesson[] = [
  {
    slug: "what-is-tmux",
    num: 1,
    title: "What tmux actually is",
    metaDescription:
      "Understand tmux in 5 minutes: the server, sessions, windows, and panes — the mental model that makes every keybinding obvious.",
    intro:
      "Most tutorials start with keybindings. That's backwards — tmux has maybe eight ideas, and once you have the model, the keys become obvious. Here's the model.",
    sections: [
      {
        heading: "The one-sentence version",
        body: "tmux keeps your terminal work running in a background process (the server), and lets any terminal connect to it, disconnect from it, and split it into as many screens as you want. Terminal crashes, laptop closes, SSH drops — your work doesn't notice.",
      },
      {
        heading: "The hierarchy",
        body: "One server runs per user, silently, started on demand. It holds sessions (workspaces — one per project is the classic setup). A session holds windows (like browser tabs, listed in the status bar at the bottom). A window holds panes (split terminals you see at the same time). Your terminal is just a client — a viewport that attaches to one session.",
        code: `server (one, invisible, holds everything)
└── session "work"          ← you attach to this
    ├── window 0: editor    ← like a tab
    │   ├── pane: nvim
    │   └── pane: tests     ← splits you see together
    └── window 1: server
        └── pane: npm run dev
└── session "ops"
    └── window 0: ssh prod`,
        codeLabel: "the whole model",
      },
      {
        heading: "Why this design matters",
        body: "Because the server owns everything, \"closing your terminal\" and \"losing your work\" become unrelated events. This is what tmux is *for*. The splits and tabs are nice; detach/reattach is the feature.",
      },
      {
        heading: "The prefix key",
        body: "Your keystrokes go to the program in the pane — so tmux needs a way to know a key is meant for *it*. That's the prefix: press `Ctrl-b`, release, then press a command key. `Ctrl-b c` means \"tmux: new window\". Every tmux keybinding works this way, and when you see `prefix + c` written anywhere, that's what it means.",
      },
    ],
    practice: [
      "Install tmux (brew install tmux / apt install tmux)",
      "Run: tmux new -s hello",
      "You're in — note the status bar at the bottom",
      "Type exit to close it again",
    ],
  },
  {
    slug: "sessions",
    num: 2,
    title: "Sessions: detach, reattach, never lose work",
    metaDescription:
      "Learn tmux sessions: create named sessions, detach with prefix d, reattach with tmux attach, and make long-running work survive SSH disconnects.",
    intro:
      "Sessions are the reason tmux exists. Learn these four commands and you already get most of tmux's value — everything else is convenience.",
    sections: [
      {
        heading: "The core loop",
        body: "Create a named session, work, detach, come back later. That's the loop you'll run for the rest of your career:",
        code: `tmux new -s work     # create + attach
# ... do things ...
# Ctrl-b d           # detach: everything keeps running
tmux ls              # see what's running
tmux attach -t work  # pick up exactly where you left off`,
        codeLabel: "shell",
      },
      {
        heading: "The SSH story (why people fall in love)",
        body: "SSH into a server, start tmux, kick off a 6-hour job, close your laptop, drive home, SSH back in, `tmux attach` — the job never noticed. Any long-running remote work that isn't inside tmux (or similar) is one flaky connection away from dying.",
      },
      {
        heading: "One habit worth stealing",
        body: "`tmux new -As main` attaches to \"main\" if it exists, creates it otherwise. Make it a shell alias and every terminal you ever open lands in the same persistent workspace:",
        code: `alias t='tmux new -As main'`,
        codeLabel: "~/.zshrc",
      },
      {
        heading: "Multiple sessions",
        body: "One session per project keeps contexts clean. `prefix s` opens an interactive session tree — switch without detaching. `prefix (` and `)` cycle, `prefix L` toggles the last two, and `prefix $` renames the current one.",
      },
    ],
    practice: [
      "tmux new -s practice",
      "Detach with Ctrl-b d",
      "Run tmux ls and find it",
      "Reattach with tmux attach -t practice",
      "Bonus: create a second session and switch with Ctrl-b s",
    ],
  },
  {
    slug: "windows-and-panes",
    num: 3,
    title: "Windows and panes: your terminal, tiled",
    metaDescription:
      "Master tmux windows and panes: split with % and \", navigate with arrows, zoom with z, and the layout tricks that keep splits manageable.",
    intro:
      "Windows are tabs; panes are splits. Ten keybindings cover 95% of daily use — these are them, in order of how often you'll press them.",
    sections: [
      {
        heading: "Panes: split and move",
        body: "`prefix %` splits side-by-side, `prefix \"` splits top/bottom (yes, the keys are unmemorable — everyone rebinds them to `|` and `-` eventually, see the config lesson). `prefix` + arrows moves between panes. `prefix x` kills one; so does exiting its shell.",
      },
      {
        heading: "Zoom — the pane feature you'll use most",
        body: "`prefix z` makes the current pane fill the window; press again to restore the splits exactly as they were. Editor on the left, logs on the right, zoom the editor when you need to focus. The status bar shows a `Z` while zoomed — if your splits ever \"vanish\", that's why.",
      },
      {
        heading: "Windows: tabs for contexts",
        body: "`prefix c` creates a window, `prefix n`/`p` cycle, `prefix 0-9` jumps by number, `prefix l` toggles your last two (the alt-tab move), `prefix ,` renames, `prefix w` shows an interactive picker with previews of everything.",
      },
      {
        heading: "When splits get messy",
        body: "`prefix Space` cycles preset layouts — even columns, even rows, one-big-pane arrangements, tiled. `prefix q` flashes pane numbers; press a number to jump. `prefix !` promotes a pane to its own window when a split deserves a full tab.",
      },
    ],
    practice: [
      "In a session, split with Ctrl-b % and Ctrl-b \"",
      "Move around with Ctrl-b + arrows",
      "Zoom with Ctrl-b z, unzoom, kill a pane with Ctrl-b x",
      "Create two windows with Ctrl-b c, toggle with Ctrl-b l",
      "Try the playground on the tutorial page if you haven't",
    ],
  },
  {
    slug: "copy-mode",
    num: 4,
    title: "Copy mode: scrolling, searching, copying",
    metaDescription:
      "Learn tmux copy mode: scroll with prefix [, search scrollback with ?, select with Space, copy with Enter — and wire copies to your system clipboard.",
    intro:
      "The first time your mouse wheel does nothing in tmux is a rite of passage. tmux keeps its own scrollback per pane, behind copy mode — freeze the screen, move like a text editor, search, copy.",
    sections: [
      {
        heading: "Scrolling",
        body: "`prefix [` enters copy mode. Arrows or PgUp/PgDn scroll, `q` exits back to live output. Enable vi keys (`setw -g mode-keys vi`) and you get `C-u`/`C-d` half-pages, `g`/`G` top/bottom — the muscle memory you already have from less and vim. Or set `set -g mouse on` and the wheel just works.",
      },
      {
        heading: "Searching — the killer feature",
        body: "Inside copy mode, `?` searches upward (which is almost always the direction you want — the error scrolled past). Type the pattern, Enter, then `n`/`N` to walk matches. Grep for your scrollback.",
      },
      {
        heading: "Copying",
        body: "Move to the start, `Space` to begin selecting, move to the end, `Enter` to copy and exit. `prefix ]` pastes. And `prefix =` shows every previous copy — tmux keeps them all as buffers, a clipboard history you get for free.",
      },
      {
        heading: "The clipboard catch",
        body: "Copies land in tmux's buffers, not your system clipboard, until you wire them together — one line for modern terminals:",
        code: `set -g set-clipboard on   # OSC 52: works locally AND over SSH`,
        codeLabel: "~/.tmux.conf",
      },
    ],
    practice: [
      "Run: seq 1 500, then scroll with Ctrl-b [ and PgUp",
      "Search: press ? inside copy mode, type 137, Enter",
      "Copy a line: Space, move, Enter — paste with Ctrl-b ]",
      "Add set-clipboard on to your config and copy to your OS clipboard",
    ],
  },
  {
    slug: "your-config",
    num: 5,
    title: "Your config: fix the defaults, then stop",
    metaDescription:
      "Build a sane .tmux.conf: the ten fixes everyone makes (mouse, colors, escape-time, better splits), how to reload, and when to reach for plugins.",
    intro:
      "tmux's defaults are famously hostile — tiny scrollback, no mouse, awkward keys, colors misconfigured for modern terminals. The fix is a ~20-line config, not a 400-line one you found on GitHub and don't understand.",
    sections: [
      {
        heading: "Where it lives",
        body: "`~/.tmux.conf` (or `~/.config/tmux/tmux.conf` on tmux ≥ 3.1). It's a list of the same commands you can type at `prefix :` — nothing magic. Reload changes with `tmux source ~/.tmux.conf`.",
      },
      {
        heading: "The baseline",
        body: "These lines fix the six complaints that fill every tmux thread — mouse, scrollback, colors, vim lag, numbering, and split keys:",
        code: `set -g mouse on
set -g history-limit 50000
set -g default-terminal "tmux-256color"
set -ga terminal-features ",*:RGB"
set -sg escape-time 10
set -g focus-events on
set -g base-index 1
set -g renumber-windows on
set -g set-clipboard on
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
bind r source-file ~/.tmux.conf \\; display "reloaded"`,
        codeLabel: "~/.tmux.conf — the sane baseline",
      },
      {
        heading: "Build yours interactively",
        body: "The config generator on this site produces this baseline with every option explained, plus prefix remapping, vi copy mode, clipboard wiring for your OS, and plugins — each line commented. Read the sane-config guide for the full line-by-line reasoning.",
      },
      {
        heading: "Plugins: less than you think",
        body: "You need zero plugins to use tmux well. The two worth knowing: tmux-resurrect (+continuum) to survive reboots, and tmux-yank if clipboard integration fights you. Install tpm, add plugin lines, press `prefix I` (capital i) to install — and know that a plugin is just a shell script run by `run-shell`, nothing more.",
      },
      {
        heading: "Where to go from here",
        body: "You now know more tmux than most daily users. Next stops: the cheat sheet (searchable, prefix-aware), the guides for the deep fixes (clipboard, colors, neovim), and `prefix ?` inside tmux — it's all discoverable from there.",
      },
    ],
    practice: [
      "Generate a config at /config/generator and save it",
      "Reload with tmux source ~/.tmux.conf",
      "Split with your new | and - keys",
      "Press prefix ? and skim what else is bound",
    ],
  },
];
