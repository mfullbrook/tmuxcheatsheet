import { describe, expect, it } from "vitest";
import { generate, type Options } from "@/components/ConfigGenerator";
import { parseConfig } from "./parse";

const BASE: Options = {
  prefix: "C-b",
  mouse: true,
  viMode: true,
  clipboard: "osc52",
  intuitiveSplits: true,
  baseIndexOne: true,
  nvimFriendly: true,
  trueColor: true,
  statusTop: false,
  reloadBinding: true,
  altArrowPanes: false,
  plugins: { resurrect: false, continuum: false, yank: false },
};

const COMBOS: Array<[string, Options]> = [
  ["defaults", BASE],
  [
    "everything on, C-a prefix, pbcopy",
    {
      ...BASE,
      prefix: "C-a",
      clipboard: "pbcopy",
      statusTop: true,
      altArrowPanes: true,
      plugins: { resurrect: true, continuum: true, yank: true },
    },
  ],
  [
    "minimal: everything off, C-Space, xclip",
    {
      ...BASE,
      prefix: "C-Space",
      mouse: false,
      viMode: false,
      clipboard: "xclip",
      intuitiveSplits: false,
      baseIndexOne: false,
      nvimFriendly: false,
      trueColor: false,
      reloadBinding: false,
    },
  ],
  [
    "plugins only, wl-copy",
    {
      ...BASE,
      clipboard: "wl-copy",
      plugins: { resurrect: true, continuum: false, yank: true },
    },
  ],
];

/**
 * Generator round-trip (design success criterion): every line the config
 * generator emits must be parsed, recognized, or plugin-grouped — zero
 * lines in skipped / "couldn't read".
 */
describe("generator round-trip", () => {
  for (const [label, options] of COMBOS) {
    it(`fully accounts for its own output (${label})`, () => {
      const conf = generate(options);
      const result = parseConfig(conf);
      expect(result.skipped).toEqual([]);
      for (const line of result.lines) {
        expect(line.kind, `line ${line.lineNo}: ${line.raw}`).not.toBe(
          "skipped",
        );
      }
      // The prefix choice round-trips.
      expect(result.prefix).toBe(options.prefix);
    });
  }

  it("groups plugin lines under plugin settings", () => {
    const conf = generate({
      ...BASE,
      plugins: { resurrect: true, continuum: true, yank: true },
    });
    const result = parseConfig(conf);
    expect(result.plugins).toEqual([
      "tmux-plugins/tpm",
      "tmux-plugins/tmux-resurrect",
      "tmux-plugins/tmux-continuum",
      "tmux-plugins/tmux-yank",
    ]);
    // the final `run '~/.tmux/plugins/tpm/tpm'` line is plugin-grouped
    const runLine = result.lines.find((l) => l.raw.startsWith("run "));
    expect(runLine?.kind).toBe("recognized");
  });

  it("triggers no stale-advice warnings on its own output", () => {
    const result = parseConfig(generate(BASE));
    expect(result.warnings.filter((w) => w.ruleId?.startsWith("stale-"))).toEqual([]);
  });
});
