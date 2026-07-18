import { describe, expect, it } from "vitest";
import { isBlank, isComment, toLogicalLines, tokenizeLine } from "./tokenize";

describe("toLogicalLines", () => {
  it("splits simple lines with 1-based numbers", () => {
    const lines = toLogicalLines("a\nb\nc");
    expect(lines.map((l) => l.text)).toEqual(["a", "b", "c"]);
    expect(lines.map((l) => l.lineNo)).toEqual([1, 2, 3]);
  });

  it("joins backslash continuations before classification (T10)", () => {
    const lines = toLogicalLines('set -g status-left "abc \\\ndef"');
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('set -g status-left "abc def"');
    expect(lines[0].lineNo).toBe(1);
    expect(lines[0].endLineNo).toBe(2);
  });

  it("does not join on escaped backslash (even count)", () => {
    const lines = toLogicalLines("set -g foo bar\\\\\nnext");
    expect(lines).toHaveLength(2);
  });

  it("joins multi-line brace blocks into one logical line", () => {
    const src = 'if-shell "true" {\n  set -g status on\n} {\n  set -g status off\n}';
    const lines = toLogicalLines(src);
    expect(lines).toHaveLength(1);
    expect(lines[0].endLineNo).toBe(5);
  });

  it("classifies blanks and comments", () => {
    const [a, b, c] = toLogicalLines("\n# hi\nset -g mouse on");
    expect(isBlank(a)).toBe(true);
    expect(isComment(b)).toBe(true);
    expect(isBlank(c) || isComment(c)).toBe(false);
  });
});

describe("tokenizeLine", () => {
  const words = (text: string) =>
    tokenizeLine(text).segments[0].map((t) => t.value);

  it("splits on whitespace, collapsing runs", () => {
    expect(words("set-option -g prefix  C-Space")).toEqual([
      "set-option",
      "-g",
      "prefix",
      "C-Space",
    ]);
  });

  it("respects double quotes with escapes", () => {
    expect(words('bind | split-window -h -c "#{pane_current_path}"')).toEqual([
      "bind",
      "|",
      "split-window",
      "-h",
      "-c",
      "#{pane_current_path}",
    ]);
    expect(words('display "a \\"b\\" c"')).toEqual(["display", 'a "b" c']);
  });

  it("respects single quotes literally", () => {
    expect(words("set -g @plugin 'tmux-plugins/tpm'")).toEqual([
      "set",
      "-g",
      "@plugin",
      "tmux-plugins/tpm",
    ]);
  });

  it("strips trailing comments outside quotes", () => {
    expect(words("set -g mouse on # turn it on")).toEqual([
      "set",
      "-g",
      "mouse",
      "on",
    ]);
    expect(words('set -g status-left "#S # not a comment"')).toEqual([
      "set",
      "-g",
      "status-left",
      "#S # not a comment",
    ]);
  });

  it("does not treat format strings as comments", () => {
    expect(words("set -ag status-right #{E:@x}")).toEqual([
      "set",
      "-ag",
      "status-right",
      "#{E:@x}",
    ]);
  });

  it("captures brace blocks as single tokens, never an error", () => {
    const { segments } = tokenizeLine(
      "bind x { split-window -h; select-pane -L }",
    );
    expect(segments[0].map((t) => t.value)).toEqual([
      "bind",
      "x",
      "{ split-window -h; select-pane -L }",
    ]);
    expect(segments[0][2].brace).toBe(true);
    // Unbalanced brace swallows the rest of the line without throwing.
    expect(() => tokenizeLine("bind x { oops")).not.toThrow();
  });

  it("splits command chains on \\;", () => {
    const { segments } = tokenizeLine(
      'bind r source-file ~/.tmux.conf \\; display "reloaded"',
    );
    expect(segments).toHaveLength(2);
    expect(segments[0].map((t) => t.value)).toEqual([
      "bind",
      "r",
      "source-file",
      "~/.tmux.conf",
    ]);
    expect(segments[1].map((t) => t.value)).toEqual(["display", "reloaded"]);
  });

  it("splits chains when \\; is attached to the previous word", () => {
    const { segments } = tokenizeLine(
      "bind y set synchronize-panes\\; display 'done'",
    );
    expect(segments).toHaveLength(2);
    expect(segments[0].map((t) => t.value)).toEqual([
      "bind",
      "y",
      "set",
      "synchronize-panes",
    ]);
  });

  it("keeps quoted keys as single tokens with quoted flag", () => {
    const { segments } = tokenizeLine("bind '\"' split-window");
    expect(segments[0][1]).toMatchObject({ value: '"', quoted: true });
  });
});
