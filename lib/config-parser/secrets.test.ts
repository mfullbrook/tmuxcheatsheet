import { describe, expect, it } from "vitest";
import {
  MASK,
  looksHighEntropy,
  maskConfigText,
  maskSecrets,
} from "./secrets";

describe("maskSecrets", () => {
  it("masks setenv values with secret-shaped names", () => {
    const r = maskSecrets("setenv -g GITHUB_TOKEN ghp_abc123");
    expect(r.hasSecret).toBe(true);
    expect(r.masked).toBe(`setenv -g GITHUB_TOKEN ${MASK}`);
  });

  it("masks set-environment values (long form, PASSWORD)", () => {
    const r = maskSecrets('set-environment -g DB_PASSWORD "hunter2"');
    expect(r.hasSecret).toBe(true);
    expect(r.masked).toContain(MASK);
    expect(r.masked).not.toContain("hunter2");
  });

  it("masks secret-named @-options set via set -g", () => {
    const r = maskSecrets("set -g @openweather-api-key abc123def");
    expect(r.hasSecret).toBe(true);
    expect(r.masked).toBe(`set -g @openweather-api-key ${MASK}`);
  });

  it("masks NAME=VALUE assignments with secret-shaped names", () => {
    const r = maskSecrets(
      'run-shell "AWS_SECRET_ACCESS_KEY=abc123 my-script.sh"',
    );
    expect(r.hasSecret).toBe(true);
    expect(r.masked).not.toContain("abc123");
    expect(r.masked).toContain("AWS_SECRET_ACCESS_KEY=");
  });

  it("masks long high-entropy strings", () => {
    const r = maskSecrets(
      "run-shell 'curl -H xoxb1234abcd5678efgh9012ijkl example.com'",
    );
    expect(r.hasSecret).toBe(true);
    expect(r.masked).not.toContain("xoxb1234abcd5678efgh9012ijkl");
  });

  it("does NOT mask mode-keys or status-keys (safe option names)", () => {
    expect(maskSecrets("set -g mode-keys vi").hasSecret).toBe(false);
    expect(maskSecrets("setw -g status-keys emacs").hasSecret).toBe(false);
  });

  it("does NOT mask ordinary bindings and options", () => {
    for (const line of [
      "bind r source-file ~/.tmux.conf \\; display 'reloaded'",
      "set -g default-terminal tmux-256color",
      "set -g @plugin 'tmux-plugins/tmux-resurrect'",
      "set -g history-limit 100000",
      "bind -T copy-mode-vi y send -X copy-pipe-and-cancel pbcopy",
    ]) {
      expect(maskSecrets(line).hasSecret, line).toBe(false);
    }
  });

  it("masks non-setenv environment variables named like secrets", () => {
    const r = maskSecrets("setenv -g HOMEBREW_GITHUB_API_TOKEN deadbeef");
    expect(r.masked).toBe(`setenv -g HOMEBREW_GITHUB_API_TOKEN ${MASK}`);
  });

  it("leaves setenv with benign names alone", () => {
    expect(maskSecrets("setenv -g EDITOR vim").hasSecret).toBe(false);
  });
});

describe("looksHighEntropy", () => {
  it("accepts credential shapes", () => {
    expect(looksHighEntropy("ghp_16C7e42F292c6912E7710c838347Ae178B4a")).toBe(
      true,
    );
    expect(looksHighEntropy("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9")).toBe(true);
  });

  it("rejects paths, plugin specs, $TERM values, and short strings", () => {
    expect(looksHighEntropy("~/.tmux/plugins/tpm/tpm")).toBe(false);
    expect(looksHighEntropy("tmux-plugins/tmux-resurrect")).toBe(false);
    expect(looksHighEntropy("tmux-256color")).toBe(false);
    expect(looksHighEntropy("copy-pipe-and-cancel")).toBe(false);
    expect(looksHighEntropy("abc123")).toBe(false);
    expect(looksHighEntropy("aaaaaaaaaaaaaaaaaaaa1")).toBe(false);
  });
});

describe("maskConfigText", () => {
  it("masks every line independently", () => {
    const src = [
      "set -g mouse on",
      "setenv -g API_KEY sk-abc123",
      "set -g history-limit 5000",
    ].join("\n");
    const out = maskConfigText(src);
    expect(out.split("\n")[0]).toBe("set -g mouse on");
    expect(out.split("\n")[1]).toBe(`setenv -g API_KEY ${MASK}`);
    expect(out.split("\n")[2]).toBe("set -g history-limit 5000");
  });
});
