import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

const routes = [
  "",
  "/about",
  "/quests",
  "/login",
  "/register",
  "/terms",
  "/privacy",
  "/faq",
  "/guidelines",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency:
      route === "/quests"
        ? "daily"
        : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
