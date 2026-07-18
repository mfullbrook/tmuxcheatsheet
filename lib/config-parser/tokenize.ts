/**
 * Line-level tokenizer for .tmux.conf text.
 *
 * Responsibilities (and nothing more — no command knowledge lives here):
 *   - join backslash line-continuations BEFORE any classification
 *   - join multi-line `{ ... }` brace blocks into one logical line
 *   - strip trailing comments, respecting quoting
 *   - split a logical line into words, respecting single/double quotes
 *   - capture `{ ... }` brace blocks (tmux >= 3.0) as a single token
 *   - split command chains on `\;` (and bare unquoted `;`)
 *
 * Browser-safe: pure string processing, no platform APIs.
 */

/** One logical config line (continuations/brace blocks already joined). */
export interface LogicalLine {
  /** 1-based first physical line number. */
  lineNo: number;
  /** 1-based last physical line number (== lineNo unless joined). */
  endLineNo: number;
  /** Raw physical text as pasted (newlines preserved for joined lines). */
  raw: string;
  /** Joined text the tokenizer operates on. */
  text: string;
}

/** A single word after quote/brace processing. */
export interface Token {
  /** Word value with surrounding quotes removed. */
  value: string;
  /** True if the word was single- or double-quoted. */
  quoted: boolean;
  /** True if the word is a `{ ... }` brace block (value includes braces). */
  brace: boolean;
}

/** A logical line tokenized into `\;`-separated command segments. */
export interface TokenizedLine {
  /** Command segments: chains have length > 1, plain lines length 1. */
  segments: Token[][];
}

/** Count unquoted, un-escaped brace depth delta of one physical line. */
function braceDelta(line: string): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === "\\" && quote === '"') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "\\") {
      i++;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === "#" && depth === 0) {
      // comment start at depth 0 ends the line's contribution
      const prev = i === 0 ? " " : line[i - 1];
      const next = line[i + 1];
      if (/\s/.test(prev) && next !== "{" && next !== "(") break;
    } else if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
    }
  }
  return depth;
}

/**
 * Split source into logical lines: backslash continuations are joined first
 * (T10 — before any line classification), then lines left with an open
 * unquoted `{` consume following physical lines until braces balance.
 */
export function toLogicalLines(source: string): LogicalLine[] {
  const physical = source.split(/\r\n|\r|\n/);
  const out: LogicalLine[] = [];
  let i = 0;
  while (i < physical.length) {
    const startLine = i + 1;
    const rawParts: string[] = [physical[i]];
    let text = physical[i];
    // Join backslash continuations: an odd number of trailing backslashes
    // continues the line.
    while (/(?:^|[^\\])(\\\\)*\\$/.test(text) && i + 1 < physical.length) {
      i++;
      rawParts.push(physical[i]);
      text = text.slice(0, -1) + physical[i];
    }
    // Join open brace blocks spanning physical lines.
    let depth = braceDelta(text);
    while (depth > 0 && i + 1 < physical.length) {
      i++;
      rawParts.push(physical[i]);
      text += "\n" + physical[i];
      depth += braceDelta(physical[i]);
    }
    out.push({
      lineNo: startLine,
      endLineNo: i + 1,
      raw: rawParts.join("\n"),
      text,
    });
    i++;
  }
  return out;
}

/** True if the logical line is blank. */
export function isBlank(line: LogicalLine): boolean {
  return line.text.trim() === "";
}

/** True if the logical line is a whole-line comment. */
export function isComment(line: LogicalLine): boolean {
  return line.text.trimStart().startsWith("#");
}

/**
 * Tokenize one logical line into `\;`-separated segments of words.
 *
 * Quoting rules follow tmux's config reader closely enough for reading:
 * double quotes allow backslash escapes; single quotes are literal; `{ ... }`
 * captures a brace block (nested braces counted) as one token — never an
 * error, even if unbalanced (the rest of the line is swallowed); `#` starts
 * a comment only at a word boundary and not before `{`/`(` (format strings).
 */
export function tokenizeLine(text: string): TokenizedLine {
  const segments: Token[][] = [[]];
  let words = segments[0];

  let i = 0;
  const n = text.length;

  const pushSeparator = () => {
    if (words.length > 0) {
      words = [];
      segments.push(words);
    }
  };

  while (i < n) {
    const c = text[i];
    if (c === " " || c === "\t" || c === "\n") {
      i++;
      continue;
    }
    // Comment: `#` at a word start, not a format construct.
    if (c === "#" && text[i + 1] !== "{" && text[i + 1] !== "(") {
      break;
    }
    // Bare `;` at word start: top-level command separator.
    if (c === ";") {
      i++;
      pushSeparator();
      continue;
    }
    // Brace block token.
    if (c === "{") {
      let depth = 0;
      let j = i;
      let quote: string | null = null;
      for (; j < n; j++) {
        const b = text[j];
        if (quote) {
          if (b === "\\" && quote === '"') j++;
          else if (b === quote) quote = null;
          continue;
        }
        if (b === "\\") j++;
        else if (b === '"' || b === "'") quote = b;
        else if (b === "{") depth++;
        else if (b === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      words.push({ value: text.slice(i, j), quoted: false, brace: true });
      i = j;
      continue;
    }
    // Regular word (possibly containing quoted spans).
    let value = "";
    let sawQuote = false;
    let separatorAfter = false;
    while (i < n) {
      const w = text[i];
      if (w === " " || w === "\t" || w === "\n") break;
      if (w === ";") {
        // Bare semicolon ends the word and the segment.
        i++;
        separatorAfter = true;
        break;
      }
      if (w === "\\") {
        const nx = text[i + 1];
        if (nx === ";") {
          // `\;` — chain separator.
          i += 2;
          separatorAfter = true;
          break;
        }
        if (nx === undefined) {
          value += "\\";
          i++;
          break;
        }
        // Keep other backslash escapes literally (parser is a reader, not a
        // shell); tmux passes most of these through to commands.
        value += "\\" + nx;
        i += 2;
        continue;
      }
      if (w === "'" || w === '"') {
        sawQuote = true;
        const q = w;
        i++;
        while (i < n && text[i] !== q) {
          if (q === '"' && text[i] === "\\" && i + 1 < n) {
            const esc = text[i + 1];
            if (esc === '"' || esc === "\\" || esc === "$" || esc === "`") {
              value += esc;
            } else {
              value += "\\" + esc;
            }
            i += 2;
            continue;
          }
          value += text[i];
          i++;
        }
        i++; // closing quote (or end of line)
        continue;
      }
      value += w;
      i++;
    }
    if (value.length > 0 || sawQuote) {
      words.push({ value, quoted: sawQuote, brace: false });
    }
    if (separatorAfter) pushSeparator();
  }

  // Drop a trailing empty segment left by a trailing separator.
  if (segments.length > 1 && segments[segments.length - 1].length === 0) {
    segments.pop();
  }
  return { segments };
}
