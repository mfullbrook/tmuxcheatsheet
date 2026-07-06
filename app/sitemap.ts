import type { MetadataRoute } from "next";
import { COMMAND_PAGES } from "@/lib/data/command-pages";
import { GUIDES } from "@/lib/data/guides";
import { LESSONS } from "@/lib/data/lessons";

const BASE = "https://tmuxlab.dev";
const LAST_MODIFIED = new Date("2026-07-05");

export default function sitemap(): MetadataRoute.Sitemap {
  const statics = ["", "/commands", "/tutorial", "/config", "/config/generator", "/guides"];
  return [
    ...statics.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: LAST_MODIFIED,
      priority: p === "" ? 1 : 0.8,
    })),
    ...COMMAND_PAGES.map((p) => ({
      url: `${BASE}/commands/${p.slug}`,
      lastModified: LAST_MODIFIED,
      priority: 0.7,
    })),
    ...GUIDES.map((g) => ({
      url: `${BASE}/guides/${g.slug}`,
      lastModified: LAST_MODIFIED,
      priority: 0.7,
    })),
    ...LESSONS.map((l) => ({
      url: `${BASE}/tutorial/${l.slug}`,
      lastModified: LAST_MODIFIED,
      priority: 0.6,
    })),
  ];
}
