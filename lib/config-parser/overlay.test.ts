import { describe, expect, it } from "vitest";
import { buildOverlay, datasetAtoms } from "./overlay";
import { parseConfig } from "./parse";

const overlay = (src: string) => buildOverlay(parseConfig(src));

describe("datasetAtoms", () => {
  it("expands grouped rows per the matchKeys/matchCommands convention", () => {
    const atoms = datasetAtoms();
    const arrows = atoms.filter((a) => a.bindingId === "select-pane-arrows");
    expect(arrows.map((a) => [a.key, a.command])).toEqual([
      ["Up", "select-pane -U"],
      ["Down", "select-pane -D"],
      ["Left", "select-pane -L"],
      ["Right", "select-pane -R"],
    ]);
    const windows = atoms.filter((a) => a.bindingId === "select-window");
    expect(windows).toHaveLength(10);
    // single matchCommands applies to all keys
    const move = atoms.filter((a) => a.bindingId === "copy-page-up");
    expect(move.map((a) => a.command)).toEqual(["page-up", "page-up"]);
  });
});

describe("buildOverlay", () => {
  it("no config changes -> everything default", () => {
    const m = overlay("set -g mouse on\n");
    for (const e of m.entries.values()) expect(e.status).toBe("default");
    expect(m.customBindings).toHaveLength(0);
  });

  it("rebound: same command on a different key", () => {
    const m = overlay("bind v split-window -h\nunbind %\n");
    const e = m.entries.get("split-pane-right")!;
    expect(e.status).toBe("rebound");
    expect(e.userKeys).toContain("v");
  });

  it("remapped: same key, different command", () => {
    const m = overlay('bind % run-shell "tmux-sessionizer"\n');
    expect(m.entries.get("split-pane-right")!.status).toBe("remapped");
    // the user's command matches no dataset entry -> custom
    expect(m.customBindings.map((c) => c.key)).toContain("%");
  });

  it("modified: matched with annotations, never clean", () => {
    const m = overlay('bind c new-window -c "#{pane_current_path}"\n');
    const e = m.entries.get("new-window")!;
    expect(e.status).toBe("modified");
    expect(e.annotations).toContain("+ opens in current directory");
  });

  it("chained bindings are always modified, never clean matches (T10)", () => {
    const m = overlay("bind [ copy-mode \\; display 'copy mode'\n");
    expect(m.entries.get("enter-copy-mode")!.status).toBe("modified");
  });

  it("unbound: explicitly unbound defaults are struck", () => {
    const m = overlay("unbind x\n");
    expect(m.entries.get("kill-pane")!.status).toBe("unbound");
  });

  it("unbind -a marks the table's defaults unbound + collapsed group flag", () => {
    const m = overlay("unbind -a\nbind c new-window\n");
    expect(m.unbindAllTables.has("prefix")).toBe(true);
    expect(m.entries.get("new-window")!.status).toBe("default");
    expect(m.entries.get("kill-pane")!.status).toBe("unbound");
  });

  it("custom bindings carry a noPrefix flag for -n/root bindings", () => {
    const m = overlay('bind -n M-Enter display-popup -E "tm"\n');
    const c = m.customBindings.find((c) => c.key === "M-Enter")!;
    expect(c.noPrefix).toBe(true);
  });

  it("root-table rebinds of prefix-table commands are matched", () => {
    const m = overlay("bind -n M-Left select-pane -L\n");
    const e = m.entries.get("select-pane-arrows")!;
    expect(e.status).not.toBe("default");
    expect(e.userKeys).toContain("M-Left");
  });

  it("copy-mode-vi send -X bindings overlay copy-mode entries", () => {
    const m = overlay(
      "bind -T copy-mode-vi v send -X begin-selection\nbind -T copy-mode-vi y send -X copy-pipe-and-cancel 'pbcopy'\n",
    );
    expect(m.entries.get("copy-begin-selection")!.status).toBe("rebound");
    expect(m.entries.get("copy-begin-selection")!.userKeys).toContain("v");
    // extra pipe arg -> modified, not clean
    expect(m.entries.get("copy-copy-selection")!.status).toBe("modified");
  });

  it("brace-block bindings land in customBindings, labeled by the caller", () => {
    const m = overlay("bind x { split-window -h }\n");
    const c = m.customBindings.find((cb) => cb.key === "x")!;
    expect(c.braceBlock).toBe(true);
  });
});
