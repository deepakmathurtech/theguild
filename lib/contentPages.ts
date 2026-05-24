import "server-only";

import { promises as fs } from "fs";
import path from "path";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export type ContentBlock = {
  title: string;
  body: string;
};

export type ContentPage = {
  slug: string;
  title: string;
  eyebrow: string;
  intro: string;
  blocks: ContentBlock[];
  updatedAt?: string;
};

const contentDirectory = path.join(
  process.cwd(),
  "content"
);

export async function getContentPage(
  slug: string
): Promise<ContentPage> {
  const firestorePage =
    process.env.NEXT_PHASE ===
    "phase-production-build"
      ? null
      : await getFirestoreContentPage(slug);

  if (firestorePage) {
    return firestorePage;
  }

  const file = await fs.readFile(
    path.join(contentDirectory, `${slug}.md`),
    "utf8"
  );

  return parseMarkdownPage(slug, file);
}

async function getFirestoreContentPage(
  slug: string
) {
  try {
    const snapshot = await getDoc(
      doc(db, "content_pages", slug)
    );

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();

    return parseMarkdownPage(
      slug,
      String(data.body || ""),
      {
        title: String(data.title || ""),
        updatedAt:
          typeof data.updatedAt === "string"
            ? data.updatedAt
            : undefined,
      }
    );
  } catch (error) {
    console.log(
      "Content page Firestore fallback:",
      error
    );

    return null;
  }
}

function parseMarkdownPage(
  slug: string,
  markdown: string,
  overrides: Partial<ContentPage> = {}
): ContentPage {
  const lines = markdown
    .replace(/\r\n/g, "\n")
    .split("\n");

  const firstTitle =
    lines.find((line) =>
      line.startsWith("# ")
    ) || "";

  const title =
    overrides.title ||
    firstTitle.replace(/^#\s*/, "").trim();

  const eyebrow =
    lines
      .find((line) =>
        line.startsWith("Eyebrow:")
      )
      ?.replace("Eyebrow:", "")
      .trim() || "GUILD LEDGER";

  const intro =
    lines
      .find((line) =>
        line.startsWith("Intro:")
      )
      ?.replace("Intro:", "")
      .trim() || "";

  const blocks: ContentBlock[] = [];
  let currentTitle = "";
  let currentBody: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentTitle) {
        blocks.push({
          title: currentTitle,
          body: currentBody
            .join("\n")
            .trim(),
        });
      }

      currentTitle = line
        .replace(/^##\s*/, "")
        .trim();
      currentBody = [];
      continue;
    }

    if (
      currentTitle &&
      !line.startsWith("# ") &&
      !line.startsWith("Eyebrow:") &&
      !line.startsWith("Intro:")
    ) {
      currentBody.push(line);
    }
  }

  if (currentTitle) {
    blocks.push({
      title: currentTitle,
      body: currentBody.join("\n").trim(),
    });
  }

  return {
    slug,
    title,
    eyebrow,
    intro,
    blocks,
    updatedAt: overrides.updatedAt,
  };
}
