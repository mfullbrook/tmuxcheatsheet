"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A simulated tmux session that responds to real tmux keybindings.
 * Not a real shell — a spatial, muscle-memory trainer for the pane/window/
 * session model. Click it, then use actual tmux keys.
 */

type PaneNode =
  | { kind: "leaf"; id: number }
  | { kind: "split"; dir: "h" | "v"; a: PaneNode; b: PaneNode };

interface Win {
  id: number;
  name: string;
  root: PaneNode;
  active: number;
  zoomed: boolean;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MISSIONS = [
  { id: "split-h", label: 'split side-by-side — C-b %' },
  { id: "split-v", label: 'split top/bottom — C-b "' },
  { id: "navigate", label: "move between panes — C-b then an arrow" },
  { id: "zoom", label: "zoom a pane full-screen — C-b z (again to restore)" },
  { id: "kill", label: "kill a pane — C-b x" },
  { id: "new-window", label: "open a new window — C-b c" },
  { id: "switch-window", label: "switch windows — C-b n, p, or a number" },
  { id: "detach", label: "detach, then come back — C-b d" },
] as const;

type MissionId = (typeof MISSIONS)[number]["id"];

const FLAVOR = [
  ["$ npm run dev", "  ready on localhost:3000"],
  ["$ tail -f app.log", "  [ok] request 200 /api/health"],
  ["$ htop", "  CPU ▁▂▃▅▂▁  MEM ▃▃▄"],
  ["$ git status", "  nothing to commit, working tree clean"],
  ["$ vim main.rs", '  -- INSERT --'],
  ["$ ssh prod-1", "  Welcome to prod-1"],
];

function collectLeaves(n: PaneNode, out: number[] = []): number[] {
  if (n.kind === "leaf") out.push(n.id);
  else {
    collectLeaves(n.a, out);
    collectLeaves(n.b, out);
  }
  return out;
}

function splitLeaf(n: PaneNode, target: number, dir: "h" | "v", newId: number): PaneNode {
  if (n.kind === "leaf") {
    if (n.id !== target) return n;
    return { kind: "split", dir, a: n, b: { kind: "leaf", id: newId } };
  }
  return { ...n, a: splitLeaf(n.a, target, dir, newId), b: splitLeaf(n.b, target, dir, newId) };
}

function removeLeaf(n: PaneNode, target: number): PaneNode | null {
  if (n.kind === "leaf") return n.id === target ? null : n;
  const a = removeLeaf(n.a, target);
  const b = removeLeaf(n.b, target);
  if (a && b) return { ...n, a, b };
  return a ?? b;
}

function layout(n: PaneNode, rect: Rect, out: Map<number, Rect>): void {
  if (n.kind === "leaf") {
    out.set(n.id, rect);
    return;
  }
  if (n.dir === "h") {
    const w = rect.w / 2;
    layout(n.a, { ...rect, w }, out);
    layout(n.b, { ...rect, x: rect.x + w, w }, out);
  } else {
    const h = rect.h / 2;
    layout(n.a, { ...rect, h }, out);
    layout(n.b, { ...rect, y: rect.y + h, h }, out);
  }
}

function neighbor(
  rects: Map<number, Rect>,
  from: number,
  dir: "L" | "R" | "U" | "D",
): number | null {
  const f = rects.get(from);
  if (!f) return null;
  const fc = { x: f.x + f.w / 2, y: f.y + f.h / 2 };
  let best: number | null = null;
  let bestDist = Infinity;
  for (const [id, r] of rects) {
    if (id === from) continue;
    const c = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    const ok =
      dir === "L" ? c.x < fc.x - 1 :
      dir === "R" ? c.x > fc.x + 1 :
      dir === "U" ? c.y < fc.y - 1 :
      c.y > fc.y + 1;
    if (!ok) continue;
    const d = Math.hypot(c.x - fc.x, c.y - fc.y);
    if (d < bestDist) {
      bestDist = d;
      best = id;
    }
  }
  return best;
}

export function TmuxPlayground() {
  const [wins, setWins] = useState<Win[]>([
    { id: 0, name: "main", root: { kind: "leaf", id: 0 }, active: 0, zoomed: false },
  ]);
  const [activeWin, setActiveWin] = useState(0);
  const [detached, setDetached] = useState(false);
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showNumbers, setShowNumbers] = useState(false);
  const [done, setDone] = useState<Set<MissionId>>(new Set());
  const [focused, setFocused] = useState(false);
  const nextPane = useRef(1);
  const nextWin = useRef(1);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const complete = useCallback((m: MissionId) => {
    setDone((prev) => {
      if (prev.has(m)) return prev;
      const next = new Set(prev);
      next.add(m);
      return next;
    });
  }, []);

  const flash = useCallback((text: string) => {
    setMsg(text);
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(null), 1600);
  }, []);

  const win = wins[activeWin];
  const rects = new Map<number, Rect>();
  if (win) {
    if (win.zoomed) rects.set(win.active, { x: 0, y: 0, w: 100, h: 100 });
    else layout(win.root, { x: 0, y: 0, w: 100, h: 100 }, rects);
  }

  const updateWin = useCallback(
    (fn: (w: Win) => Win) => {
      setWins((ws) => ws.map((w, i) => (i === activeWin ? fn(w) : w)));
    },
    [activeWin],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    // Let the browser handle tab-away for accessibility.
    if (e.key === "Tab") return;
    e.preventDefault();
    e.stopPropagation();

    if (detached) {
      setDetached(false);
      complete("detach");
      flash("attached — everything was still here");
      return;
    }

    if (e.ctrlKey && e.key === "b") {
      setArmed(true);
      if (armTimer.current) clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => setArmed(false), 3000);
      return;
    }

    if (!armed) return;
    setArmed(false);

    const w = wins[activeWin];
    if (!w) return;

    switch (e.key) {
      case "%": {
        const id = nextPane.current++;
        updateWin((w) => ({
          ...w,
          zoomed: false,
          root: splitLeaf(w.root, w.active, "h", id),
          active: id,
        }));
        complete("split-h");
        break;
      }
      case '"': {
        const id = nextPane.current++;
        updateWin((w) => ({
          ...w,
          zoomed: false,
          root: splitLeaf(w.root, w.active, "v", id),
          active: id,
        }));
        complete("split-v");
        break;
      }
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
      case "ArrowDown": {
        const dir =
          e.key === "ArrowLeft" ? "L" :
          e.key === "ArrowRight" ? "R" :
          e.key === "ArrowUp" ? "U" : "D";
        const n = neighbor(rects, w.active, dir);
        if (n !== null) {
          updateWin((w) => ({ ...w, active: n, zoomed: false }));
          complete("navigate");
        }
        break;
      }
      case "o": {
        const leaves = collectLeaves(w.root);
        const i = leaves.indexOf(w.active);
        updateWin((w) => ({
          ...w,
          active: leaves[(i + 1) % leaves.length],
          zoomed: false,
        }));
        complete("navigate");
        break;
      }
      case "z": {
        updateWin((w) => ({ ...w, zoomed: !w.zoomed }));
        complete("zoom");
        flash(w.zoomed ? "unzoomed" : "zoomed — note the Z in the window name");
        break;
      }
      case "x": {
        const leaves = collectLeaves(w.root);
        if (leaves.length === 1) {
          if (wins.length === 1) {
            flash("that's the last pane — killing it would end the session");
            break;
          }
          setWins((ws) => ws.filter((_, i) => i !== activeWin));
          setActiveWin((i) => Math.max(0, i - 1));
          complete("kill");
          break;
        }
        const root = removeLeaf(w.root, w.active);
        if (root) {
          const remaining = collectLeaves(root);
          updateWin((w) => ({
            ...w,
            root,
            active: remaining[0],
            zoomed: false,
          }));
          complete("kill");
        }
        break;
      }
      case "c": {
        const id = nextWin.current++;
        const pane = nextPane.current++;
        setWins((ws) => [
          ...ws,
          {
            id,
            name: ["work", "logs", "ssh", "scratch"][id % 4],
            root: { kind: "leaf", id: pane },
            active: pane,
            zoomed: false,
          },
        ]);
        setActiveWin(wins.length);
        complete("new-window");
        break;
      }
      case "n":
        setActiveWin((i) => (i + 1) % wins.length);
        if (wins.length > 1) complete("switch-window");
        break;
      case "p":
        setActiveWin((i) => (i - 1 + wins.length) % wins.length);
        if (wins.length > 1) complete("switch-window");
        break;
      case "d":
        setDetached(true);
        flash("");
        break;
      case "q": {
        setShowNumbers(true);
        setTimeout(() => setShowNumbers(false), 1200);
        break;
      }
      case "?":
        flash("in real tmux this lists every keybinding");
        break;
      default: {
        const digit = /^[0-9]$/.test(e.key) ? Number(e.key) : null;
        if (digit !== null) {
          const idx = wins.findIndex((x) => x.id === digit);
          if (idx !== -1) {
            setActiveWin(idx);
            if (wins.length > 1) complete("switch-window");
          } else {
            flash(`no window ${digit}`);
          }
        }
      }
    }
  }

  useEffect(() => {
    return () => {
      if (armTimer.current) clearTimeout(armTimer.current);
      if (msgTimer.current) clearTimeout(msgTimer.current);
    };
  }, []);

  const allDone = done.size === MISSIONS.length;

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-4 items-start">
      <div>
        <div
          ref={boxRef}
          data-tmux-playground
          tabIndex={0}
          role="application"
          aria-label="Interactive tmux playground — click, then use tmux keybindings"
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setArmed(false);
          }}
          onClick={() => boxRef.current?.focus()}
          className={
            "relative h-[380px] sm:h-[440px] bg-[#0a0c10] border outline-none select-none overflow-hidden " +
            (focused ? "border-accent" : "border-edge-bright cursor-pointer")
          }
        >
          {detached ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
              <p className="text-muted text-[13px]">[detached (from session main)]</p>
              <p className="text-fg">
                Your session is still running — nothing was lost.
              </p>
              <p className="text-faint text-[13px]">
                press any key to run{" "}
                <code className="text-accent">tmux attach</code>
              </p>
            </div>
          ) : (
            <>
              {/* panes */}
              <div className="absolute inset-x-0 top-0 bottom-6">
                {[...rects.entries()].map(([id, r]) => {
                  const active = win && id === win.active;
                  const flavor = FLAVOR[id % FLAVOR.length];
                  return (
                    <div
                      key={id}
                      onClick={(e) => {
                        e.stopPropagation();
                        boxRef.current?.focus();
                        updateWin((w) => ({ ...w, active: id }));
                      }}
                      className={
                        "absolute p-2 overflow-hidden border transition-colors duration-100 " +
                        (active ? "border-accent" : "border-edge")
                      }
                      style={{
                        left: `${r.x}%`,
                        top: `${r.y}%`,
                        width: `${r.w}%`,
                        height: `${r.h}%`,
                      }}
                    >
                      {showNumbers && (
                        <span className="absolute inset-0 flex items-center justify-center text-4xl text-cat-copy bg-black/50 z-10">
                          {[...rects.keys()].indexOf(id)}
                        </span>
                      )}
                      <div className="text-[11.5px] leading-relaxed text-muted">
                        {flavor.map((line, i) => (
                          <div key={i} className={i === 0 ? "text-fg" : ""}>
                            {line}
                          </div>
                        ))}
                        {active && (
                          <span className="inline-block w-2 h-3.5 bg-accent align-middle animate-pulse" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* inner status bar */}
              <div className="absolute inset-x-0 bottom-0 h-6 bg-[#10141c] border-t border-edge flex items-center px-2 text-[11.5px] gap-1">
                {msg ? (
                  <span className="text-black bg-cat-copy px-1 flex-1">{msg}</span>
                ) : (
                  <>
                    <span className="text-accent">[main]</span>
                    {wins.map((w, i) => (
                      <span
                        key={w.id}
                        className={
                          "px-1 " +
                          (i === activeWin
                            ? "bg-accent text-black"
                            : "text-muted")
                        }
                      >
                        {w.id}:{w.name}
                        {i === activeWin ? (w.zoomed ? "*Z" : "*") : ""}
                      </span>
                    ))}
                    <span className="flex-1" />
                    <span
                      className={
                        "px-1 " + (armed ? "bg-accent text-black" : "text-faint")
                      }
                    >
                      ^B
                    </span>
                  </>
                )}
              </div>
              {!focused && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                  <span className="border border-accent text-accent px-4 py-2 text-[13px]">
                    click to attach
                  </span>
                </div>
              )}
            </>
          )}
        </div>
        <p className="text-faint text-[12px] mt-2">
          A simulated session — real keybindings, zero risk. Esc/Tab to leave.
        </p>
      </div>

      <div className="border border-edge bg-surface">
        <div className="border-b border-edge px-3 py-2 text-[12px] flex justify-between">
          <span className="text-faint">missions</span>
          <span className={allDone ? "text-accent" : "text-faint"}>
            {done.size}/{MISSIONS.length}
          </span>
        </div>
        <ul className="p-2">
          {MISSIONS.map((m) => (
            <li
              key={m.id}
              className="flex gap-2 px-1.5 py-1 text-[12.5px] items-start"
            >
              <span
                className={
                  "shrink-0 whitespace-pre " +
                  (done.has(m.id) ? "text-accent" : "text-faint")
                }
              >
                {done.has(m.id) ? "[x]" : "[ ]"}
              </span>
              <span className={done.has(m.id) ? "text-faint line-through" : "text-muted"}>
                {m.label}
              </span>
            </li>
          ))}
        </ul>
        {allDone && (
          <p className="px-3 pb-3 text-[12.5px] text-accent">
            That&apos;s the whole core loop — you know tmux now. Time to{" "}
            <a href="/config/generator" className="underline">
              make your config
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}
