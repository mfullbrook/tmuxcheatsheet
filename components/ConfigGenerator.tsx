"use client";

import { useMemo, useState } from "react";
import { useTmuxSite } from "./KeyboardProvider";
import { copyText } from "@/lib/copy";
import { optionComment } from "@/lib/data/option-docs";

type Clipboard = "osc52" | "pbcopy" | "xclip" | "wl-copy";

export interface Options {
  prefix: "C-b" | "C-a" | "C-Space";
  mouse: boolean;
  viMode: boolean;
  clipboard: Clipboard;
  intuitiveSplits: boolean;
  baseIndexOne: boolean;
  nvimFriendly: boolean;
  trueColor: boolean;
  statusTop: boolean;
  reloadBinding: boolean;
  altArrowPanes: boolean;
  plugins: { resurrect: boolean; continuum: boolean; yank: boolean };
}

const DEFAULTS: Options = {
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

export function generate(o: Options): string {
  const L: string[] = [];
  L.push("# ~/.tmux.conf — generated with tmuxlab.dev/config/generator");
  L.push("# every line explained; delete anything you don't want\n");

  L.push("##### core #####\n");
  if (o.prefix !== "C-b") {
    L.push(`# prefix: ${o.prefix} instead of the default C-b`);
    L.push(`set -g prefix ${o.prefix}`);
    L.push("unbind C-b");
    L.push(`bind ${o.prefix} send-prefix\n`);
  }
  if (o.trueColor) {
    L.push(...optionComment("default-terminal"));
    L.push('set -g default-terminal "tmux-256color"');
    L.push('set -ga terminal-features ",*:RGB"\n');
  }
  if (o.mouse) {
    L.push(...optionComment("mouse"));
    L.push("set -g mouse on\n");
  }
  L.push(...optionComment("history-limit"));
  L.push("set -g history-limit 50000\n");
  if (o.nvimFriendly) {
    L.push("# vim/neovim friendliness: no Esc lag, focus events for");
    L.push("# autoread — resolves the classic :checkhealth warnings");
    L.push("set -sg escape-time 10");
    L.push("set -g focus-events on\n");
  }
  if (o.baseIndexOne) {
    L.push("# number windows/panes from 1 (matches keyboard order),");
    L.push("# renumber when one closes so there are no gaps");
    L.push("set -g base-index 1");
    L.push("setw -g pane-base-index 1");
    L.push("set -g renumber-windows on\n");
  }

  L.push("##### keybindings #####\n");
  if (o.intuitiveSplits) {
    L.push("# splits that look like the symbol, opening in the current dir");
    L.push('bind | split-window -h -c "#{pane_current_path}"');
    L.push('bind - split-window -v -c "#{pane_current_path}"');
    L.push('bind c new-window -c "#{pane_current_path}"\n');
  }
  if (o.altArrowPanes) {
    L.push("# switch panes with Alt+arrow — no prefix needed");
    L.push("bind -n M-Left select-pane -L");
    L.push("bind -n M-Right select-pane -R");
    L.push("bind -n M-Up select-pane -U");
    L.push("bind -n M-Down select-pane -D\n");
  }
  if (o.reloadBinding) {
    L.push("# reload this file with prefix r");
    L.push(
      'bind r source-file ~/.tmux.conf \\; display "config reloaded"\n',
    );
  }

  if (o.viMode) {
    L.push("##### copy mode #####\n");
    L.push(...optionComment("mode-keys"));
    L.push("setw -g mode-keys vi");
    L.push("bind -T copy-mode-vi v send -X begin-selection");
    const pipe: Record<Clipboard, string | null> = {
      osc52: null,
      pbcopy: "pbcopy",
      xclip: "xclip -selection clipboard -i",
      "wl-copy": "wl-copy",
    };
    const cmd = pipe[o.clipboard];
    if (cmd) {
      L.push(`bind -T copy-mode-vi y send -X copy-pipe-and-cancel "${cmd}"`);
    } else {
      L.push("bind -T copy-mode-vi y send -X copy-selection-and-cancel");
    }
    L.push("");
  }
  L.push(...optionComment("set-clipboard"));
  L.push("set -g set-clipboard on\n");

  L.push("##### status bar #####\n");
  if (o.statusTop) {
    L.push("set -g status-position top");
  }
  L.push("# quiet, readable status line");
  L.push('set -g status-style "bg=default,fg=colour244"');
  L.push('setw -g window-status-current-style "fg=colour114,bold"');
  L.push('set -g status-left "#[fg=colour114][#S] "');
  L.push("set -g status-left-length 30");
  L.push('set -g status-right "%H:%M"\n');

  const anyPlugin =
    o.plugins.resurrect || o.plugins.continuum || o.plugins.yank;
  if (anyPlugin) {
    L.push("##### plugins (tpm) #####");
    L.push("# install tpm first:");
    L.push("#   git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm");
    L.push("# then press prefix + I (capital i) inside tmux to install\n");
    L.push("set -g @plugin 'tmux-plugins/tpm'");
    if (o.plugins.resurrect) {
      L.push("# save/restore sessions across reboots (prefix C-s / C-r)");
      L.push("set -g @plugin 'tmux-plugins/tmux-resurrect'");
    }
    if (o.plugins.continuum) {
      L.push("# auto-save every 15 min and auto-restore on start");
      L.push("set -g @plugin 'tmux-plugins/tmux-continuum'");
      L.push("set -g @continuum-restore 'on'");
    }
    if (o.plugins.yank) {
      L.push("# battle-tested clipboard integration for every platform");
      L.push("set -g @plugin 'tmux-plugins/tmux-yank'");
    }
    L.push("");
    L.push("# keep this line at the very bottom of the file");
    L.push("run '~/.tmux/plugins/tpm/tpm'");
  }
  return L.join("\n");
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-start gap-2 text-left w-full px-2 py-1.5 hover:bg-hover"
    >
      <span className={checked ? "text-accent" : "text-faint"}>
        {checked ? "[x]" : "[ ]"}
      </span>
      <span className="flex-1">
        <span className="text-fg text-[13.5px]">{label}</span>
        {hint && (
          <span className="block text-[12px] text-faint">{hint}</span>
        )}
      </span>
    </button>
  );
}

export function ConfigGenerator() {
  const [o, setO] = useState<Options>(DEFAULTS);
  const { showMessage } = useTmuxSite();
  const config = useMemo(() => generate(o), [o]);
  const set = (patch: Partial<Options>) => setO((p) => ({ ...p, ...patch }));

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
      <div className="border border-edge bg-surface">
        <div className="border-b border-edge px-3 py-2 text-[12px] text-faint">
          options
        </div>
        <div className="p-2 space-y-4">
          <div>
            <div className="text-[12px] text-faint px-2 mb-1">prefix key</div>
            <div className="flex border border-edge mx-2">
              {(["C-b", "C-a", "C-Space"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => set({ prefix: p })}
                  className={
                    "flex-1 px-2 py-1 text-[13px] " +
                    (o.prefix === p
                      ? "bg-accent text-black font-medium"
                      : "text-muted hover:text-fg")
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Toggle
              checked={o.mouse}
              onChange={(v) => set({ mouse: v })}
              label="mouse support"
              hint="wheel scroll, click panes, drag borders"
            />
            <Toggle
              checked={o.trueColor}
              onChange={(v) => set({ trueColor: v })}
              label="true color"
              hint="fixes washed-out vim/nvim themes"
            />
            <Toggle
              checked={o.nvimFriendly}
              onChange={(v) => set({ nvimFriendly: v })}
              label="vim / neovim friendly"
              hint="no Esc delay, focus events"
            />
            <Toggle
              checked={o.intuitiveSplits}
              onChange={(v) => set({ intuitiveSplits: v })}
              label="splits on | and -"
              hint="and everything opens in the current dir"
            />
            <Toggle
              checked={o.baseIndexOne}
              onChange={(v) => set({ baseIndexOne: v })}
              label="windows start at 1"
              hint="with automatic renumbering"
            />
            <Toggle
              checked={o.altArrowPanes}
              onChange={(v) => set({ altArrowPanes: v })}
              label="Alt+arrows switch panes"
              hint="no prefix needed"
            />
            <Toggle
              checked={o.reloadBinding}
              onChange={(v) => set({ reloadBinding: v })}
              label="prefix r reloads config"
            />
            <Toggle
              checked={o.viMode}
              onChange={(v) => set({ viMode: v })}
              label="vi copy mode"
              hint="v to select, y to copy"
            />
            <Toggle
              checked={o.statusTop}
              onChange={(v) => set({ statusTop: v })}
              label="status bar on top"
            />
          </div>

          <div>
            <div className="text-[12px] text-faint px-2 mb-1">
              clipboard method
            </div>
            <div className="px-2 grid grid-cols-2 gap-1">
              {(
                [
                  ["osc52", "OSC 52 (modern, SSH-safe)"],
                  ["pbcopy", "pbcopy (macOS)"],
                  ["xclip", "xclip (Linux X11)"],
                  ["wl-copy", "wl-copy (Wayland)"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => set({ clipboard: val })}
                  className={
                    "border px-2 py-1 text-[12px] text-left " +
                    (o.clipboard === val
                      ? "border-accent text-accent"
                      : "border-edge text-muted hover:text-fg")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[12px] text-faint px-2 mb-1">
              plugins (adds tpm)
            </div>
            <Toggle
              checked={o.plugins.resurrect}
              onChange={(v) =>
                set({ plugins: { ...o.plugins, resurrect: v } })
              }
              label="tmux-resurrect"
              hint="save/restore sessions across reboots"
            />
            <Toggle
              checked={o.plugins.continuum}
              onChange={(v) =>
                set({
                  plugins: { ...o.plugins, continuum: v, resurrect: v || o.plugins.resurrect },
                })
              }
              label="tmux-continuum"
              hint="…automatically (implies resurrect)"
            />
            <Toggle
              checked={o.plugins.yank}
              onChange={(v) => set({ plugins: { ...o.plugins, yank: v } })}
              label="tmux-yank"
              hint="bulletproof clipboard everywhere"
            />
          </div>
        </div>
      </div>

      <div className="border border-edge bg-raised min-w-0">
        <div className="border-b border-edge px-3 py-2 flex items-center gap-3">
          <span className="text-[12px] text-faint flex-1">~/.tmux.conf</span>
          <button
            className="text-[12px] text-muted hover:text-accent"
            onClick={async () => {
              const ok = await copyText(config);
              showMessage(
                ok
                  ? "copied your .tmux.conf"
                  : "copy failed — select manually",
              );
            }}
          >
            [copy]
          </button>
          <a
            className="text-[12px] text-muted hover:text-accent"
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(config)}`}
            download=".tmux.conf"
          >
            [download]
          </a>
        </div>
        <pre className="overflow-x-auto p-3 text-[12.5px] leading-relaxed max-h-[70vh] overflow-y-auto">
          <code>{config}</code>
        </pre>
      </div>
    </div>
  );
}
