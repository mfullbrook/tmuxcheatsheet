# tmuxlab

The tmux cheat sheet that speaks tmux — an interactive reference, tutorial,
and config generator. Free, open source, no ads.

**Why another tmux site?** The existing ones are keystroke tables. This one:

- **Speaks tmux.** Press `Ctrl-b` then `?` on the site — real tmux
  keybindings navigate it. `/` fuzzy-searches every binding and task.
- **Shows *your* prefix.** Remapped to `C-a`? Pick it once, the entire site
  re-renders.
- **Answers tasks, not flags.** ~35 pages shaped like real questions ("how do
  I copy to the system clipboard", "why is scrolling broken") — answer first,
  gotchas second, verified against current tmux.
- **Teaches in the browser.** An interactive simulated session with real
  keybindings and missions — muscle memory before you ever install tmux.
- **Generates configs you understand.** Every line of the generated
  `.tmux.conf` is commented with its reason.
- **Covers modern tmux.** Popups, OSC 52 clipboard, `terminal-features` —
  the 3.2+ features most references still don't mention.

## Stack

Next.js (App Router, fully static) · Tailwind CSS v4 · TypeScript · zero
runtime dependencies beyond React. Deployed on Vercel.

## Development

```sh
npm install
npm run dev    # http://localhost:3000
npm run build  # static production build
```

Content lives in typed data files, not CMS soup:

- `lib/data/keybindings.ts` — every default binding (verified against
  `tmux list-keys` on 3.6)
- `lib/data/cli-commands.ts` — shell-side commands
- `lib/data/command-pages*.ts` — the task pages
- `lib/data/guides.ts`, `lib/data/lessons.ts` — long-form content

## Contributing

Corrections welcome — especially version-specific behavior. Every claim
should be reproducible against a current tmux release; run
`tmux -f /dev/null -L test` for a clean instance to verify defaults.

## License

MIT
