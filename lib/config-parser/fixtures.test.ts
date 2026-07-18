import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildOverlay } from "./overlay";
import { parseConfig } from "./parse";

const FIXTURE_DIR = join(__dirname, "fixtures");

const read = (name: string) =>
  readFileSync(join(FIXTURE_DIR, name), "utf8");

/** Expected resolved prefix per fixture (verified by inspection). */
const EXPECTED_PREFIX: Record<string, string> = {
  "caksoylar.conf": "C-Space",
  "catppuccin-example.conf": "C-b",
  "legacy-pre24.conf": "C-a",
  "nicknisi.conf": "C-a",
  "oh-my-tmux.conf": "C-b", // oh-my-tmux keeps C-b; C-a is prefix2
  "oh-my-tmux-local.conf": "C-b",
  "sensible-example.conf": "C-b",
  "skwp.conf": "C-a",
  "tmux-official-example.conf": "C-a",
  "tpm-example.conf": "C-b",
};

const FIXTURES = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith(".conf"));

describe("real-world fixtures", () => {
  it("has all 10 fixtures on disk", () => {
    expect(FIXTURES.sort()).toEqual(Object.keys(EXPECTED_PREFIX).sort());
  });

  for (const fixture of FIXTURES) {
    describe(fixture, () => {
      it("parses without throwing and resolves the correct prefix", () => {
        const result = parseConfig(read(fixture));
        expect(result.prefix).toBe(EXPECTED_PREFIX[fixture]);
      });

      it("builds an overlay without throwing", () => {
        expect(() => buildOverlay(parseConfig(read(fixture)))).not.toThrow();
      });

      it(">=90% of standard-table bind lines are overlaid or custom", () => {
        const result = parseConfig(read(fixture));
        const model = buildOverlay(result);
        // Denominator: parseable bind lines in prefix/root/copy-mode-vi —
        // i.e. lines the parser classified as bindings.
        const bindLines = result.lines.filter((l) => l.kind === "binding");
        if (bindLines.length === 0) return; // plugin-only fixtures
        // Numerator: resolved bindings accounted for by the overlay
        // (matched to a dataset entry or listed in customBindings).
        // Lines shadowed by a later bind on the same (table, key) are the
        // only ones that can fall out of the resolved map.
        expect(model.accounted).toBe(result.bindings.size);
        const ratio = model.accounted / bindLines.length;
        expect(ratio).toBeGreaterThanOrEqual(0.9);
      });
    });
  }

  it("flags conditionals in the fixtures that use them (T10)", () => {
    for (const f of ["skwp.conf", "oh-my-tmux.conf", "nicknisi.conf", "tmux-official-example.conf"]) {
      expect(parseConfig(read(f)).hasConditionals).toBe(true);
    }
  });

  it("legacy-pre24 exercises unbind -a and stale rules 3 and 4", () => {
    const r = parseConfig(read("legacy-pre24.conf"));
    expect(r.unbindAllTables.has("prefix")).toBe(true);
    expect(r.warnings.some((w) => w.ruleId === "stale-3")).toBe(true);
    expect(r.warnings.some((w) => w.ruleId === "stale-4")).toBe(true);
  });

  it("sensible-example triggers stale rules 1 and 2", () => {
    const r = parseConfig(read("sensible-example.conf"));
    expect(r.warnings.some((w) => w.ruleId === "stale-1")).toBe(true);
    expect(r.warnings.some((w) => w.ruleId === "stale-2")).toBe(true);
  });

  it("collects plugins from the plugin-centric fixtures", () => {
    expect(parseConfig(read("tpm-example.conf")).plugins).toContain(
      "tmux-plugins/tpm",
    );
    expect(
      parseConfig(read("catppuccin-example.conf")).plugins,
    ).toContain("catppuccin/tmux#v2.3.0");
  });

});

describe("explain-output snapshots", () => {
  const annotationView = (name: string) =>
    parseConfig(read(name)).lines.map((l) => ({
      lineNo: l.lineNo,
      kind: l.kind,
      explanation: l.explanation,
      warnings: l.warnings.map((w) => `${w.ruleId ?? "warn"}: ${w.message}`),
    }));

  for (const f of ["tpm-example.conf", "sensible-example.conf", "catppuccin-example.conf"]) {
    it(`locks the per-line annotations for ${f}`, () => {
      expect(annotationView(f)).toMatchSnapshot();
    });
  }
});
