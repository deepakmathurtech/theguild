import InfoPageShell from "./InfoPageShell";

import {
  getContentPage,
} from "@/lib/contentPages";

type ContentPageProps = {
  slug: string;
};

export default async function ContentPage({
  slug,
}: ContentPageProps) {
  const page = await getContentPage(slug);

  return (
    <InfoPageShell
      eyebrow={page.eyebrow}
      title={page.title}
      intro={page.intro}
      blocks={page.blocks}
      updatedAt={page.updatedAt}
    />
  );
}
