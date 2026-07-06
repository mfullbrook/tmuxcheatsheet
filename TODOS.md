# TODOS

Deferred deliberately — each was reviewed and postponed, not forgotten.
Source: /office-hours design doc (2026-07-06) + /plan-ceo-review scope decisions.

## Post-launch, week one–two
- [ ] **Shareable config permalinks** — compress pasted .tmux.conf into URL hash; explained-config pages become shareable links. Deferred until the parser has survived real r/tmux configs. (CEO plan #1)
- [ ] **Playground rebinding** — tutorial playground responds to the user's parsed prefix/keys via ConfigContext. Deferred: edge-case multiplication pre-launch. (CEO plan #4)
- [ ] **Playground drill mode** — timed "do X" prompts with streaks; a tmux muscle-memory trainer. Own mini-launch potential ("tmux typing test"). (CEO plan #6)

## Backlog
- [ ] **i18n subdirectories** (/de/, /zh/, /fr/…) — the incumbent's strongest moat; big SEO upside, big content surface.
- [ ] **Community config gallery** — shareable annotated setups; needs moderation story.
- [ ] **prefix2 support** in the config parser (currently recognized, listed under "other settings," not rendered).
- [ ] **More stale-advice rules** beyond the launch six, sourced from real configs pasted post-launch.
- [ ] **tmux version selector** — pin warnings/defaults to the user's tmux version (distro tmux is often old; stale-advice accuracy is version-dependent). P3, M→S with CC, depends on parser shipping. (CEO review, codex finding)

## Launch blockers (not TODOs — do before any launch)
- [ ] Decide brand/domain; replace "tmuxlab / tmuxlab.dev" placeholder in app/layout.tsx, app/sitemap.ts, app/robots.ts, public/llms.txt
- [ ] Create GitHub repo (public at r/tmux launch), connect Vercel, deploy
