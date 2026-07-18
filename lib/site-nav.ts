/** Site pages presented as tmux "windows" in the status bar and keyboard nav. */
export interface SiteWindow {
  index: number;
  name: string;
  href: string;
}

export const SITE_WINDOWS: SiteWindow[] = [
  { index: 0, name: "cheatsheet", href: "/" },
  { index: 1, name: "learn", href: "/tutorial" },
  { index: 2, name: "config", href: "/config/generator" },
  { index: 3, name: "commands", href: "/commands" },
  { index: 4, name: "guides", href: "/guides" },
];
