import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

const routes = [
  "",
  "/about",
  "/quests",
  "/rankings",
  "/technical",
  "/faq",
  "/guidelines",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency:
      route === "/quests" ||
      route === "/rankings"
        ? "daily"
        : "weekly",
    priority:
      route === ""
        ? 1
        : route === "/quests" ||
            route === "/rankings"
          ? 0.8
          : 0.7,
  }));
}
