import type { CommandPage } from "./command-page-types";
import { PANE_WINDOW_PAGES } from "./command-pages-panes-windows";
import { SESSION_COPY_MISC_PAGES } from "./command-pages-sessions-copy";

export const COMMAND_PAGES: CommandPage[] = [
  ...PANE_WINDOW_PAGES,
  ...SESSION_COPY_MISC_PAGES,
];

export function getCommandPage(slug: string): CommandPage | undefined {
  return COMMAND_PAGES.find((p) => p.slug === slug);
}
