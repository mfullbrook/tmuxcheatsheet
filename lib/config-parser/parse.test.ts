import { describe, expect, it } from "vitest";
import {
  InputTooLargeError,
  MAX_INPUT_BYTES,
  NoContentError,
  parseConfig,
} from "./parse";

describe("input edge contract (T2)", () => {
  it("throws NoContentError for empty and whitespace-only input", () => {
    expect(() => parseConfig("")).toThrow(NoContentError);
    expect(() => parseConfig("   \n\t\n")).toThrow(NoContentError);
  });

  it("exports the 256KB cap and enforces it defensively", () => {
    expect(MAX_INPUT_BYTES).toBe(262144);
    expect(() => parseConfig("#".repeat(MAX_INPUT_BYTES + 1))).toThrow(
      InputTooLargeError,
    );
  });

  it("exposes counts for the not-a-tmux-config heuristic (T5)", () => {
    const r = parseConfig("hello world\nthis is prose\n");
    expect(r.counts.parsed + r.counts.recognized).toBe(0);
    expect(r.counts.skipped).toBe(2);
  });
});

describe("event stream, last-wins", () => {
  it("unbind C-b then bind C-b yields a live binding", () => {
    const r = parseConfig("unbind C-b\nbind C-b send-prefix\n");
    expect(r.unbinds.has("prefix C-b")).toBe(false);
    expect(r.bindings.get("prefix C-b")?.commandName).toBe("send-prefix");
  });

  it("bind then unbind removes the binding", () => {
    const r = parseConfig("bind x kill-pane\nunbind x\n");
    expect(r.bindings.has("prefix x")).toBe(false);
    expect(r.unbinds.has("prefix x")).toBe(true);
  });

  it("duplicate set -g prefix takes the last value", () => {
    const r = parseConfig("set -g prefix C-a\nset -g prefix C-Space\n");
    expect(r.prefix).toBe("C-Space");
  });

  it("later bind on the same key wins", () => {
    const r = parseConfig("bind x kill-pane\nbind x kill-window\n");
    expect(r.bindings.get("prefix x")?.commandName).toBe("kill-window");
  });

  it("set -u returns an option to its default", () => {
    const r = parseConfig("set -g prefix C-a\nset -gu prefix\n");
    expect(r.prefix).toBe("C-b");
    expect(r.options.has("prefix")).toBe(false);
  });

  it("unbind -a wipes prior bindings for the table and is flagged (T9)", () => {
    const r = parseConfig(
      "bind x kill-pane\nunbind -a\nbind y kill-window\n",
    );
    expect(r.unbindAllTables.has("prefix")).toBe(true);
    expect(r.bindings.has("prefix x")).toBe(false);
    expect(r.bindings.has("prefix y")).toBe(true);
    expect(r.warnings.some((w) => w.ruleId === "unbind-all")).toBe(true);
  });

  it("unbind -a -T table only wipes that table", () => {
    const r = parseConfig(
      "bind -T copy-mode-vi v send -X begin-selection\nunbind -a -T copy-mode-vi\nbind x kill-pane\n",
    );
    expect(r.unbindAllTables.has("copy-mode-vi")).toBe(true);
    expect(r.bindings.has("copy-mode-vi v")).toBe(false);
    expect(r.bindings.has("prefix x")).toBe(true);
  });
});

describe("bind grammar", () => {
  it("handles -n (root table), -r, and -N notes", () => {
    const r = parseConfig(
      'bind -n M-Left select-pane -L\nbind -r H resize-pane -L 10\nbind -N "Reload config" R source-file ~/.tmux.conf\n',
    );
    expect(r.bindings.get("root M-Left")?.table).toBe("root");
    expect(r.bindings.get("prefix H")?.repeatable).toBe(true);
    expect(r.bindings.get("prefix R")?.note).toBe("Reload config");
  });

  it("captures brace-block commands without error", () => {
    const r = parseConfig("bind x { split-window -h }\n");
    const b = r.bindings.get("prefix x")!;
    expect(b.braceBlock).toBe(true);
    expect(b.commandName).toBeNull();
    expect(r.lines[0].explanation.join(" ")).toContain(
      "command block (not interpreted)",
    );
  });

  it("flags chains and annotates the reload idiom", () => {
    const r = parseConfig(
      'bind r source-file ~/.tmux.conf \\; display "reloaded"\n',
    );
    const b = r.bindings.get("prefix r")!;
    expect(b.chained).toBe(true);
    expect(b.chainedCount).toBe(1);
    const parts = r.lines[0].explanation.join(" | ");
    expect(parts).toContain("+1 chained command");
    expect(parts).toContain("also displays a message");
  });

  it("skips non-whitelisted tables with a count", () => {
    const r = parseConfig("bind -T copy-mode C-w send -X copy-selection\n");
    expect(r.bindings.size).toBe(0);
    expect(r.skipped).toHaveLength(1);
  });

  it("keeps quoted keys and expands aliases", () => {
    const r = parseConfig("bind '\"' splitw -v\n");
    const b = r.bindings.get('prefix "')!;
    expect(b.commandName).toBe("split-window");
  });
});

describe("options", () => {
  it("accepts all set forms and scope flags", () => {
    const r = parseConfig(
      "set -g mouse on\nset-option -s escape-time 10\nsetw -g mode-keys vi\nset-window-option -gq pane-base-index 1\n",
    );
    expect(r.options.get("mouse")?.value).toBe("on");
    expect(r.options.get("escape-time")?.value).toBe("10");
    expect(r.options.get("mode-keys")?.value).toBe("vi");
    expect(r.options.get("pane-base-index")?.value).toBe("1");
  });

  it("annotates -a append forms as appended (not merged)", () => {
    const r = parseConfig('set -ga status-position top\n');
    expect(r.options.get("status-position")?.appended).toBe(true);
    expect(r.lines[0].explanation.join(" ")).toContain("appended (not merged)");
  });

  it("recognizes prefix2 into other settings, not the prefix", () => {
    const r = parseConfig("set -g prefix2 C-a\n");
    expect(r.prefix).toBe("C-b");
    expect(r.lines[0].kind).toBe("recognized");
  });

  it("warns visibly on mode-keys emacs", () => {
    const r = parseConfig("setw -g mode-keys emacs\n");
    expect(r.warnings.some((w) => w.ruleId === "mode-keys-emacs")).toBe(true);
  });

  it("groups @-options and @plugin under plugin settings", () => {
    const r = parseConfig(
      "set -g @plugin 'tmux-plugins/tpm'\nset -g @continuum-restore 'on'\n",
    );
    expect(r.plugins).toEqual(["tmux-plugins/tpm"]);
    expect(
      r.lines
        .filter((l) => l.kind !== "blank")
        .every((l) => l.kind === "recognized"),
    ).toBe(true);
  });

  it("captures setenv values for secret masking", () => {
    const r = parseConfig("setenv -g GITHUB_TOKEN abc123\n");
    expect(r.environment).toEqual([
      { name: "GITHUB_TOKEN", value: "abc123", lineNo: 1 },
    ]);
  });
});

describe("source-file and conditionals", () => {
  it("collects sourced paths", () => {
    const r = parseConfig("source-file ~/.tmux.conf.local\nsource ~/extra.conf\n");
    expect(r.sourcesFiles).toEqual(["~/.tmux.conf.local", "~/extra.conf"]);
    expect(r.lines[0].kind).toBe("annotation");
  });

  it("sets hasConditionals for if-shell and %if (T10 banner)", () => {
    expect(parseConfig('if-shell "true" "set -g mouse on"\n').hasConditionals).toBe(true);
    expect(parseConfig("%if #{TMUX}\nset -g status-bg red\n%endif\n").hasConditionals).toBe(true);
    expect(parseConfig("set -g mouse on\n").hasConditionals).toBe(false);
  });

  it("skips %if block contents with references", () => {
    const r = parseConfig("%if #{TMUX}\nset -g status-bg red\n%endif\nset -g mouse on\n");
    expect(r.options.has("status-bg")).toBe(false);
    expect(r.options.get("mouse")?.value).toBe("on");
    expect(r.skipped.length).toBe(3);
  });
});

describe("stale-advice rules 1-6", () => {
  it("rule 1: reattach-to-user-namespace", () => {
    const trigger = parseConfig(
      'set -g default-command "reattach-to-user-namespace -l $SHELL"\n',
    );
    expect(trigger.warnings.some((w) => w.ruleId === "stale-1")).toBe(true);
    expect(trigger.warnings[0].link).toBe("/commands/copy-to-system-clipboard");
    const no = parseConfig('set -g default-command "$SHELL"\n');
    expect(no.warnings.some((w) => w.ruleId === "stale-1")).toBe(false);
  });

  it("rule 2: default-terminal screen-256color", () => {
    const trigger = parseConfig('set -g default-terminal "screen-256color"\n');
    expect(trigger.warnings.some((w) => w.ruleId === "stale-2")).toBe(true);
    expect(trigger.warnings[0].link).toBe("/guides/tmux-colors");
    const no = parseConfig('set -g default-terminal "tmux-256color"\n');
    expect(no.warnings.some((w) => w.ruleId === "stale-2")).toBe(false);
  });

  it("rule 3: legacy bind -t vi-copy", () => {
    const trigger = parseConfig("bind -t vi-copy 'v' begin-selection\n");
    expect(trigger.warnings.some((w) => w.ruleId === "stale-3")).toBe(true);
    expect(trigger.bindings.size).toBe(0);
    const no = parseConfig("bind -T copy-mode-vi v send -X begin-selection\n");
    expect(no.warnings.some((w) => w.ruleId === "stale-3")).toBe(false);
  });

  it("rule 4: pre-2.1 mouse options", () => {
    const trigger = parseConfig("set -g mode-mouse on\nset -g mouse-select-pane on\n");
    expect(trigger.warnings.filter((w) => w.ruleId === "stale-4")).toHaveLength(2);
    expect(trigger.warnings[0].link).toBe("/commands/mouse-mode");
    const no = parseConfig("set -g mouse on\n");
    expect(no.warnings.some((w) => w.ruleId === "stale-4")).toBe(false);
  });

  it("rule 5: terminal-overrides 256col colors=256 (info-level)", () => {
    const trigger = parseConfig(
      'set -ga terminal-overrides ",*256col*:colors=256"\n',
    );
    expect(trigger.warnings.some((w) => w.ruleId === "stale-5")).toBe(true);
    const no = parseConfig('set -as terminal-features ",*:RGB"\n');
    expect(no.warnings.some((w) => w.ruleId === "stale-5")).toBe(false);
  });

  it("rule 6: history-limit >= 500000 (info-level)", () => {
    const trigger = parseConfig("set -g history-limit 1000000\n");
    expect(trigger.warnings.some((w) => w.ruleId === "stale-6")).toBe(true);
    expect(trigger.warnings[0].link).toBe("/commands/history-limit");
    const no = parseConfig("set -g history-limit 50000\n");
    expect(no.warnings.some((w) => w.ruleId === "stale-6")).toBe(false);
  });
});

describe("per-line annotations", () => {
  it("classifies every line and keeps source order", () => {
    const r = parseConfig(
      "# comment\n\nset -g prefix C-a\nbind x kill-pane\nunbind y\nif-shell true 'set -g mouse on'\nwhat is this\n",
    );
    expect(r.lines.map((l) => l.kind)).toEqual([
      "comment",
      "blank",
      "option",
      "binding",
      "unbind",
      "skipped",
      "skipped",
      "blank", // trailing newline
    ]);
    expect(r.lines.map((l) => l.lineNo)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
