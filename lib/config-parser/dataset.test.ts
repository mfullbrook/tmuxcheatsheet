import { describe, expect, it } from "vitest";
import { ALL_BINDINGS } from "@/lib/data/keybindings";
import { canonicalKey, parseCommandString } from "./normalize";
import { datasetAtoms } from "./overlay";

/**
 * Dataset round-trip: the match fields must run cleanly through the same
 * normalization pipe as user input (both sides normalize — contract).
 */
describe("dataset round-trip", () => {
  it("every matchKeys entry canonicalizes to itself", () => {
    for (const b of ALL_BINDINGS) {
      for (const key of b.matchKeys) {
        expect(canonicalKey(key), `${b.id}: ${key}`).toBe(key);
      }
    }
  });

  it("every matchCommands entry parses through the command normalizer", () => {
    for (const b of ALL_BINDINGS) {
      for (const cmd of b.matchCommands) {
        const parsed = parseCommandString(cmd);
        expect(parsed, `${b.id}: ${cmd}`).not.toBeNull();
        expect(parsed!.name, `${b.id}: ${cmd}`).toBe(
          parsed!.name.trim(),
        );
      }
    }
  });

  it("matchCommands arrays follow the length-1-or-parallel convention", () => {
    for (const b of ALL_BINDINGS) {
      expect(
        b.matchCommands.length === 1 ||
          b.matchCommands.length === b.matchKeys.length,
        `${b.id}: matchCommands length ${b.matchCommands.length} vs matchKeys ${b.matchKeys.length}`,
      ).toBe(true);
    }
  });

  it("dataset atoms have unique (table, key) identities", () => {
    const seen = new Map<string, string>();
    for (const atom of datasetAtoms()) {
      const k = `${atom.table} ${canonicalKey(atom.key)}`;
      expect(seen.has(k), `${k} in both ${seen.get(k)} and ${atom.bindingId}`).toBe(false);
      seen.set(k, atom.bindingId);
    }
  });
});
