<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# tmuxcheatsheet.dev — agent & contributor guide

The tmux cheat sheet that speaks *your* keys. Paste a `.tmux.conf` and the cheat
sheet, search, and command pages re-render with your bindings; an explain tool
annotates the config line-by-line. Fully static Next.js site, zero runtime deps
beyond React, deployed on Vercel at **https://tmuxcheatsheet.dev**.

For the product pitch and feature list, read `README.md` first — this file is
the *how it's built and operated* companion.

## Quick start

```sh
npm install
npm run dev     # http://localhost:3000
npm run build   # static production build (Turbopack) — run before shipping
npm run lint    # eslint (NOTE: `next lint` was removed; this is plain eslint)
npm test        # vitest run — parser + dataset unit tests
```

Local tmux is the source of truth for behavior: `tmux -f /dev/null -L test`
gives a clean instance to verify default bindings/options against. The dataset
was captured from `tmux list-keys` on tmux 3.6.

## Architecture in one pass

**Everything is data + static rendering.** There is no server, no database, no
API. Content lives in typed TS files under `lib/data/`; pages under `app/`
render it at build time.

- `lib/data/` — the content model:
  - `keybindings.ts` — every default binding (81 entries: prefix + copy-mode-vi),
    verified against `tmux list-keys`. Each has **display** fields (`keys`,
    `command`, `label`) *and* **match** fields (`matchKeys`, `matchCommands`) —
    see "The parser contract" below.
  - `types.ts` — `KeyBinding`, `Category`, and the command-page types.
  - `cli-commands.ts` — shell-side (`tmux …`) commands.
  - `command-pages*.ts` — task-shaped pages ("split a pane", "copy to system
    clipboard"). Split across `-panes-windows` and `-sessions-copy` files;
    `command-pages.ts` re-exports. Each page may list `bindingIds` to crosswalk
    to keybinding rows.
  - `guides.ts`, `lessons.ts` — long-form prose content.
  - `option-docs.ts` — per-option comment strings; the config generator consumes
    these so generated `.tmux.conf` comments stay in sync with the docs.
- `lib/config-parser/` — the crown jewel; a hand-written `.tmux.conf` parser and
  overlay engine (details below). 100% client-side — a user's config never
  leaves the browser.
- `components/` — the React surface. Key ones:
  - `ConfigProvider.tsx` — holds parsed config in context + localStorage; owns
    the prefix. Use `useConfig()` / `useOptionalConfig()` (the palette mounts
    above the provider, so it must use the optional form).
  - `KeyboardProvider.tsx` — real tmux-key navigation (prefix arming, `/` search,
    `?` help). Prefix comes from ConfigProvider.
  - `CheatSheet.tsx` — the main sheet with the your-keys/defaults overlay toggle.
  - `ExplainTool.tsx` — the /config/explain page client (lazy-loads the parser).
  - `CommandPalette.tsx`, `TmuxPlayground.tsx`, `StatusBar.tsx`, `ui.tsx`.
- `app/` — App Router pages, all static. Dynamic routes (`[slug]`) use
  `generateStaticParams`. **Params are Promises in this Next.js — you must
  `await params`**, including inside `opengraph-image.tsx`, and each
  `opengraph-image.tsx` needs its OWN `generateStaticParams`.
- `lib/og/card.tsx` + `app/**/opengraph-image.tsx` — dynamic 1200×630 social
  cards in the terminal aesthetic.

## The parser contract (read before touching `lib/config-parser/`)

Pipeline: `tokenize` → `parse` (ordered event list) → `normalize` (canonicalize
keys/commands, expand aliases) → `overlay` (resolve against the default dataset,
last-wins). The design spec is `docs/designs/config-aware-tmuxlab-design.md`
(the "CEO Review Addenda" supersedes earlier text on any conflict).

Non-negotiable rules — a **wrong match is worse than a skipped line**:

- **Whitelist, not best-effort.** Only recognized `bind`/`set`/`unbind` forms
  produce overlay changes. Anything else is shown as "not annotated", never
  guessed.
- **Last-wins** resolution over the ordered event list. `unbind -a` is *applied*
  to the model (clears the table), not merely recognized.
- **Chained bindings** (`\;`) never clean-match a default — they're surfaced as
  custom, not silently equated.
- **Key canonicalization**: `^B`→`C-b`, `PPage`/`NPage`, `M-`/`Meta`
  unification, etc. **Command matching** uses alias expansion (from the
  committed `tmux list-commands` fixture) + flag-subset matching (dataset flags ⊆
  user flags; a valued flag's identity is name+arg).
- **Secrets** are masked at *render* time only (setenv values, TOKEN/KEY/SECRET/
  PASSWORD names, high-entropy strings). Parsed-overlay-only goes to
  localStorage; raw source only to sessionStorage with explicit opt-in.
- **Stale-advice rules** flag `reattach-to-user-namespace`, `screen-256color`,
  `bind -t vi-copy`, `mode-mouse`, 256-color `terminal-overrides`, huge
  `history-limit`, etc.

**Correctness is enforced by fixtures.** `lib/config-parser/fixtures/` holds 10
real-world configs (oh-my-tmux, skwp, …; licenses/provenance in the fixtures
`README.md`) plus a synthetic legacy pre-2.4 config and the committed
`list-commands-3.6b.txt`. `fixtures.test.ts` snapshots overlay output; **zero
incorrect matches** is the bar. If you change matching logic, re-run `npm test`
and review the snapshot diff line by line — a changed match is a claim you must
justify against real tmux. `aliases.ts` is generated by
`scripts/gen-aliases.ts`; regenerate rather than hand-editing.

## Editing content

- **Add/fix a keybinding** → `lib/data/keybindings.ts`. Set both display and
  match fields. Convention: a length-1 `matchCommands` applies to all
  `matchKeys`; otherwise they're parallel arrays. Verify against a real
  `tmux list-keys` before asserting.
- **Add a task page** → the relevant `command-pages-*.ts`; wire `bindingIds` to
  connect it to keys. It appears automatically via `generateStaticParams`.
- **Add a guide / lesson** → `guides.ts` / `lessons.ts`.
- **Add a config-generator option** → `option-docs.ts` (keeps generated comments
  and docs in one place).
- Any content claim should be reproducible against a current tmux release.

## Design system

Dark-first terminal aesthetic. Tokens live in `app/globals.css` as CSS custom
properties under `:root` (dark) and `:root[data-theme="light"]`, exposed to
Tailwind v4 via `@theme inline`. Core palette: bg `#0b0e14`, accent (green)
`#3ee08a`. Prefer the semantic Tailwind classes (`bg-surface`, `text-accent`,
`border-edge`) over raw hex; OG cards read the same hex values. There's a
`@media print` block that produces a compact two-page personalized cheat sheet —
test print output in both Chrome and Safari (collapsed `<details>` render
differently) when touching it.

## Deployment runbook

Host: **Vercel** (project `tmuxcheatsheet`, team `mfullbrooks-projects`), static
build. DNS: **Cloudflare** (domain registered there; managed via the `cf` CLI —
`npx cf`). GitHub: `github.com/mfullbrook/tmuxcheatsheet` (public; the site's
"report a parse bug" link and footer point at it).

Deploy the current tree:

```sh
npx vercel deploy --prod --yes
```

DNS is already configured; if you ever rebuild it, the **critical gotcha**:

- Point the apex `A` record at **`216.198.79.1`** — Vercel's *current* anycast
  IP. The legacy `76.76.21.21` that `vercel domains inspect` still prints will
  **not complete TLS cert issuance** for a newly added domain. The source of
  truth is the config API's `recommendedIPv4` rank-1
  (`GET /v6/domains/<name>/config`), not the CLI's text hint.
- Keep the record **DNS-only (unproxied / grey cloud)** in Cloudflare; proxying
  can cause SSL redirect loops with Vercel's edge.
- If HTTPS hangs after DNS resolves (`SSL_ERROR_SYSCALL`, no cert), the cert is
  queued — unstick it with `npx vercel certs issue tmuxcheatsheet.dev`.
- `ssoProtection` is `all_except_custom_domains`: the apex is public, preview
  `*.vercel.app` URLs stay behind Vercel SSO. Don't test public access on a
  preview URL — it will 302 to SSO by design.

Deploys are currently **manual via CLI** (the Vercel project is not wired to the
GitHub repo for auto-deploy). Connecting Git integration is a reasonable future
improvement.

## Non-obvious gotchas

- Params are Promises (`await params`); OG image routes need their own
  `generateStaticParams`; `ImageResponse` is imported from `next/og`.
- `npm run lint` is plain eslint, not `next lint` (removed).
- Storage keys: `tmuxlab:config:v1`, `tmuxlab:show-defaults:v1`,
  `tmuxlab:config:source`; legacy `tmux-prefix` is migrated on load. (The
  `tmuxlab:` prefix is historical brand — safe to leave; changing it needs a
  migration.)
- The build emits ~108 static pages; `npm run build` + `npm run lint` +
  `npm test` should all be green before shipping.
- `TODOS.md` holds intentionally deferred work (permalinks, playground
  rebinding, drill mode, i18n). Don't build those without a decision.
