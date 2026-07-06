import { describe, expect, it } from "vitest";
import { parseConfig } from "./parse";
import {
  deserializeConfig,
  prefixOnlyConfig,
  SCHEMA_VERSION,
  serializeConfig,
} from "./storage";

const SAMPLE = `
set -g prefix C-a
unbind C-b
bind | split-window -h
bind - split-window -v
set -g mouse on
set -g @plugin 'tmux-plugins/tmux-resurrect'
setenv -g MY_TOKEN abc123
`;

describe("storage round-trip", () => {
  it("survives serialize → JSON → deserialize", () => {
    const parsed = parseConfig(SAMPLE);
    const json = JSON.stringify(serializeConfig(parsed));
    const back = deserializeConfig(json);
    expect(back).not.toBeNull();
    expect(back!.prefix).toBe(parsed.prefix);
    expect(back!.bindings).toEqual(parsed.bindings);
    expect(back!.unbinds).toEqual(parsed.unbinds);
    expect(back!.unbindAllTables).toEqual(parsed.unbindAllTables);
    expect(back!.options).toEqual(parsed.options);
    expect(back!.plugins).toEqual(parsed.plugins);
    expect(back!.hasConditionals).toBe(parsed.hasConditionals);
    expect(back!.counts).toEqual(parsed.counts);
  });

  it("does not persist raw-source-bearing fields", () => {
    const parsed = parseConfig(SAMPLE);
    const serialized = serializeConfig(parsed);
    expect(serialized).not.toHaveProperty("lines");
    expect(serialized).not.toHaveProperty("skipped");
    expect(serialized).not.toHaveProperty("environment");
    expect(JSON.stringify(serialized)).not.toContain("abc123");
    const back = deserializeConfig(JSON.stringify(serialized))!;
    expect(back.lines).toEqual([]);
    expect(back.skipped).toEqual([]);
    expect(back.environment).toEqual([]);
  });

  it("carries the rememberSource opt-in flag (defaults false)", () => {
    const parsed = parseConfig(SAMPLE);
    expect(serializeConfig(parsed).rememberSource).toBe(false);
    expect(
      serializeConfig(parsed, { rememberSource: true }).rememberSource,
    ).toBe(true);
  });

  it("stamps the current schemaVersion", () => {
    expect(serializeConfig(parseConfig(SAMPLE)).schemaVersion).toBe(
      SCHEMA_VERSION,
    );
  });
});

describe("deserializeConfig rejection", () => {
  it("rejects a wrong schemaVersion", () => {
    const parsed = parseConfig(SAMPLE);
    const bad = { ...serializeConfig(parsed), schemaVersion: 2 };
    expect(deserializeConfig(JSON.stringify(bad))).toBeNull();
  });

  it("rejects malformed JSON and non-object payloads", () => {
    expect(deserializeConfig("not json {")).toBeNull();
    expect(deserializeConfig("null")).toBeNull();
    expect(deserializeConfig('"a string"')).toBeNull();
    expect(deserializeConfig("[1,2,3]")).toBeNull();
  });

  it("rejects a payload missing required fields", () => {
    expect(deserializeConfig(JSON.stringify({ schemaVersion: 1 }))).toBeNull();
    expect(
      deserializeConfig(JSON.stringify({ schemaVersion: 1, prefix: "C-a" })),
    ).toBeNull();
  });
});

describe("prefixOnlyConfig (legacy tmux-prefix migration)", () => {
  it("builds a minimal config carrying only the prefix", () => {
    const config = prefixOnlyConfig("C-Space");
    expect(config.prefix).toBe("C-Space");
    expect(config.bindings.size).toBe(0);
    expect(config.options.size).toBe(0);
    expect(config.lines).toEqual([]);
  });

  it("round-trips through storage", () => {
    const json = JSON.stringify(serializeConfig(prefixOnlyConfig("M-b")));
    const back = deserializeConfig(json);
    expect(back!.prefix).toBe("M-b");
    expect(back!.bindings.size).toBe(0);
  });
});
