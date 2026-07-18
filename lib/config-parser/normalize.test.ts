import { describe, expect, it } from "vitest";
import {
  canonicalKey,
  expandAlias,
  matchesDataset,
  parseCommandString,
} from "./normalize";

describe("canonicalKey", () => {
  it("converts caret notation: ^B -> C-b", () => {
    expect(canonicalKey("^B")).toBe("C-b");
    expect(canonicalKey("^a")).toBe("C-a");
  });

  it("lowercases ctrl-letter (tmux treats C-B == C-b)", () => {
    expect(canonicalKey("C-B")).toBe("C-b");
    expect(canonicalKey("C-b")).toBe("C-b");
  });

  it("unifies Meta- and M-", () => {
    expect(canonicalKey("Meta-x")).toBe("M-x");
    expect(canonicalKey("M-x")).toBe("M-x");
  });

  it("unquotes quoted keys", () => {
    expect(canonicalKey("'v'")).toBe("v");
    expect(canonicalKey('"|"')).toBe("|");
  });

  it("preserves case for plain keys (g vs G)", () => {
    expect(canonicalKey("g")).toBe("g");
    expect(canonicalKey("G")).toBe("G");
  });

  it("normalizes named keys to list-keys notation", () => {
    expect(canonicalKey("up")).toBe("Up");
    expect(canonicalKey("PageUp")).toBe("PPage");
    expect(canonicalKey("PgDn")).toBe("NPage");
    expect(canonicalKey("space")).toBe("Space");
    expect(canonicalKey("enter")).toBe("Enter");
    expect(canonicalKey("Esc")).toBe("Escape");
    expect(canonicalKey("tab")).toBe("Tab");
    expect(canonicalKey("backspace")).toBe("BSpace");
    expect(canonicalKey("Home")).toBe("Home");
    expect(canonicalKey("insert")).toBe("IC");
    expect(canonicalKey("Delete")).toBe("DC");
    expect(canonicalKey("f5")).toBe("F5");
  });

  it("handles modifier combos in canonical order", () => {
    expect(canonicalKey("M-Up")).toBe("M-Up");
    expect(canonicalKey("C-M-x")).toBe("C-M-x");
    expect(canonicalKey("M-C-x")).toBe("C-M-x");
    expect(canonicalKey("C-Space")).toBe("C-Space");
  });

  it("leaves single punctuation keys alone", () => {
    expect(canonicalKey("%")).toBe("%");
    expect(canonicalKey('"')).toBe('"');
    expect(canonicalKey("-")).toBe("-");
  });
});

describe("expandAlias / parseCommandString", () => {
  it("expands aliases to canonical names", () => {
    expect(expandAlias("splitw")).toBe("split-window");
    expect(expandAlias("selectp")).toBe("select-pane");
    expect(expandAlias("neww")).toBe("new-window");
    expect(expandAlias("split-window")).toBe("split-window");
  });

  it("parses flags per the list-commands spec (valued vs boolean)", () => {
    const cmd = parseCommandString(
      'split-window -h -c "#{pane_current_path}" -l 30%',
    )!;
    expect(cmd.name).toBe("split-window");
    expect(cmd.flags.get("h")).toBeNull();
    expect(cmd.flags.get("c")).toBe("#{pane_current_path}");
    expect(cmd.flags.get("l")).toBe("30%");
  });

  it("handles attached flag values (-Tcopy-mode)", () => {
    const cmd = parseCommandString("unbind-key -Tcopy-mode MouseDrag1Pane")!;
    expect(cmd.flags.get("T")).toBe("copy-mode");
    expect(cmd.positionals).toEqual(["MouseDrag1Pane"]);
  });

  it("splits boolean flag clusters", () => {
    const cmd = parseCommandString("split-window -hbf -l 34 fleet")!;
    expect([...cmd.flags.keys()].sort()).toEqual(["b", "f", "h", "l"]);
    expect(cmd.positionals).toEqual(["fleet"]);
  });

  it("strips the copy-mode send-keys -X wrapper to the bare action", () => {
    const cmd = parseCommandString(
      'send-keys -X copy-pipe-and-cancel "pbcopy"',
    )!;
    expect(cmd.copyModeAction).toBe(true);
    expect(cmd.name).toBe("copy-pipe-and-cancel");
    expect(cmd.actionArgs).toEqual(["pbcopy"]);
    // the `send` alias too
    const short = parseCommandString("send -X begin-selection")!;
    expect(short.name).toBe("begin-selection");
  });
});

describe("matchesDataset (flag matching per contract)", () => {
  it('matches `bind \'"\' splitw -v` onto split-window', () => {
    const res = matchesDataset("splitw -v", "split-window");
    expect(res.match).toBe(true);
  });

  it("dataset flags must be a subset of user flags", () => {
    expect(matchesDataset("split-window", "split-window -h").match).toBe(
      false,
    );
    expect(matchesDataset("split-window -h", "split-window -h").match).toBe(
      true,
    );
  });

  it('annotates -c "#{pane_current_path}" as "opens in current directory"', () => {
    const res = matchesDataset(
      'split-window -h -c "#{pane_current_path}"',
      "split-window -h",
    );
    expect(res.match).toBe(true);
    expect(res.annotations).toContain("+ opens in current directory");
  });

  it("differing -l values on the dataset side break the match", () => {
    expect(
      matchesDataset("split-window -h -l 30%", "split-window -h -l 50%").match,
    ).toBe(false);
  });

  it("-l is annotated but still a match when the dataset has no -l", () => {
    const res = matchesDataset("split-window -h -l 30%", "split-window -h");
    expect(res.match).toBe(true);
    expect(res.annotations).toContain("+ sized 30%");
  });

  it("directional -U/-D/-L/-R variants match per-flag", () => {
    expect(matchesDataset("select-pane -U", "select-pane -U").match).toBe(true);
    expect(matchesDataset("select-pane -U", "select-pane -D").match).toBe(
      false,
    );
  });

  it("valued flag identity includes the argument", () => {
    expect(
      matchesDataset("select-window -t :=3", "select-window -t :=3").match,
    ).toBe(true);
    expect(
      matchesDataset("select-window -t :=3", "select-window -t :=4").match,
    ).toBe(false);
  });

  it("different command names never match", () => {
    expect(matchesDataset("kill-pane", "kill-window").match).toBe(false);
  });

  it("dataset positionals must be present (confirm-before kill-window)", () => {
    expect(
      matchesDataset("confirm-before kill-window", "confirm-before kill-window")
        .match,
    ).toBe(true);
    expect(
      matchesDataset("confirm-before kill-pane", "confirm-before kill-window")
        .match,
    ).toBe(false);
  });

  it("copy-mode actions compare bare", () => {
    const res = matchesDataset(
      'send-keys -X copy-pipe-and-cancel "wl-copy"',
      "copy-pipe-and-cancel",
    );
    expect(res.match).toBe(true);
    expect(res.annotations).toContain("+ wl-copy");
  });
});
