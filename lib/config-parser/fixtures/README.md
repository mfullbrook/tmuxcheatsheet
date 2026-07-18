# Config parser test fixtures

Ten real-world `.tmux.conf` files used as fixtures for the tmux config parser.
All fetched 2026-07-06 via `raw.githubusercontent.com` from the default branch
of each repo. Only repos with permissive licenses (verified via the GitHub
license API) were used. Fetched files are byte-faithful copies; none contained
personal data (emails, real usernames in paths, hostnames, tokens), so no
scrubbing edits were required. README-derived fixtures are assembled verbatim
from the fenced config blocks in the named README. One fixture is synthetic
(see `legacy-pre24.conf`).

| Fixture | Source | Commit (file) | License | Lines |
|---|---|---|---|---|
| `oh-my-tmux.conf` | https://github.com/gpakosz/.tmux (`.tmux.conf`) | `af33f07134b7` (2026-02-21) | MIT | 1900 |
| `oh-my-tmux-local.conf` | https://github.com/gpakosz/.tmux (`.tmux.conf.local`) | `3ab67a5ae3df` (2025-11-10) | MIT | 509 |
| `skwp.conf` | https://github.com/skwp/dotfiles (`tmux/tmux.conf`) | `94fae5339d5e` (2020-11-16) | BSD-2-Clause | 102 |
| `nicknisi.conf` | https://github.com/nicknisi/dotfiles (`config/tmux/tmux.conf`) | `639a8d18974b` (2026-07-06) | MIT | 164 |
| `caksoylar.conf` | https://github.com/caksoylar/dotfiles (`tmux/tmux.conf`) | `c6712db5b0c6` (2025-10-27) | Unlicense | 119 |
| `tmux-official-example.conf` | https://github.com/tmux/tmux (`example_tmux.conf`) | `d0eb3fe543ff` (2024-08-04) | ISC | 71 |
| `tpm-example.conf` | https://github.com/tmux-plugins/tpm (README example) | `e261deb1b476` (2026-05-17) | MIT | 12 |
| `sensible-example.conf` | https://github.com/tmux-plugins/tmux-sensible (README blocks) | `e463ee9a752d` (2022-08-14) | MIT | 41 |
| `catppuccin-example.conf` | https://github.com/catppuccin/tmux (README example + plugin lines) | `d2d25bd3393f` (2026-04-08) | MIT | 34 |
| `legacy-pre24.conf` | Synthetic — hand-assembled from documented historical examples (tmux <= 2.3 man pages, common pre-2015 dotfiles) | n/a | n/a (original to this repo) | 54 |

## What each fixture exercises

- **oh-my-tmux.conf** — the 300+ line "monster" (1900 lines). Heavy `\;`
  command chains (335), backslash line continuations (133), brace usage in
  format strings, `%if` blocks, `if-shell`/`run-shell` bootstrap tricks,
  `setenv`/`set-environment`, `source-file` lines, `-N` binding notes,
  `set`/`setw`/`set-option` variants, embedded shell in comments.
- **oh-my-tmux-local.conf** — the customization overlay: `@plugin` options
  (tpm), `%if` block, commented option templates, format-string braces.
- **skwp.conf** — the "if-shell heavily" fixture: 9 `if-shell` uses including
  version-gated `if-shell -b '[ ... bc ... ]'` with backslash continuations and
  nested quoted bindings (vim-tmux-navigator pattern), plus
  `if-shell "[ -f ... ]" 'source ...'` — proves graceful skipping of
  conditionals the parser can't evaluate.
- **nicknisi.conf** — modern config with brace-block bindings (`bind X { ... }`),
  `copy-mode-vi` bindings with `mode-keys vi`, `\;` chains, `source-file`.
- **caksoylar.conf** — `-N` note-annotated bindings (17), `copy-mode-vi`,
  brace blocks, `set-option`/`set-window-option` long forms.
- **tmux-official-example.conf** — the minimal beginner config shipped with
  tmux itself; includes a `%if` block and simple `set`/`bind` lines.
- **tpm-example.conf** — canonical tpm plugin block: `@plugin` option lines
  (including commented `#branch` and git-URL forms) and the `run ...tpm` line.
- **sensible-example.conf** — tmux-sensible README example: server-level
  `set -s`, `setw`, simple binds, quoted `source-file` binding. Doubles as a
  second minimal config.
- **catppuccin-example.conf** — theme/plugin-heavy example: multiple `@plugin`
  lines (with `#tag` pin), `@catppuccin_*` user options, `set -agF` append
  variants with `#{E:...}` formats, bare `run` lines.
- **legacy-pre24.conf** — SYNTHETIC (noted in file header). Pre-2.4
  `bind -t vi-copy` / `bind -t emacs-copy` tables, pre-2.1 `mode-mouse` and
  `mouse-select-*` options, `status-utf8`, `unbind -a`, `setenv`, `\;` chains,
  backslash continuations. Proves the parser skips removed syntax gracefully.

## Parser-contract coverage map

- Brace-block bindings `{ ... }`: nicknisi, caksoylar, tmux-official-example
- `\;` command chains: oh-my-tmux, nicknisi, caksoylar, legacy-pre24
- Backslash line continuations: oh-my-tmux, skwp, legacy-pre24
- `set` / `setw` / `set-option` / `set-window-option` variants: all; long forms in caksoylar, legacy-pre24
- `unbind -a`: legacy-pre24
- `-N` binding notes: caksoylar, oh-my-tmux
- `source-file` / `source`: skwp, nicknisi, sensible-example, oh-my-tmux
- `@plugin` options: tpm-example, oh-my-tmux-local, catppuccin-example, sensible-example
- `setenv` / `set-environment`: oh-my-tmux, legacy-pre24
- `%if` blocks: tmux-official-example, oh-my-tmux, oh-my-tmux-local
- `if-shell` (graceful skipping): skwp (heavy), oh-my-tmux, nicknisi, caksoylar
- Legacy pre-2.4 syntax (`bind -t vi-copy`, `mode-mouse`): legacy-pre24
- `copy-mode-vi` + `mode-keys vi`: nicknisi, caksoylar, oh-my-tmux

## License-verification substitutions

Several commonly recommended configs had **no license** and were rejected:
`tony/tmux-config`, `samoshkin/tmux-config`, `ThePrimeagen/.dotfiles`,
`omerxx/dotfiles`, `craftzdog/dotfiles-public`, `nviennot/tmux-config`,
`hamvocke/dotfiles`, `dreamsofcode-io/tmux`, `joshmedeski/dotfiles`
(also `square/maximum-awesome` and `thoughtbot/dotfiles`: NOASSERTION).
Substituted with skwp/dotfiles (BSD-2), nicknisi/dotfiles (MIT),
caksoylar/dotfiles (Unlicense), tmux/tmux example (ISC), and
catppuccin/tmux README example (MIT).
