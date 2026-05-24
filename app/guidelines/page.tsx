import ContentPage from "@/components/guild/ContentPage";
import { pageMetadata } from "@/lib/site";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Community Guidelines",
  path: "/guidelines",
});

export default function GuidelinesPage() {
  return <ContentPage slug="guidelines" />;
}
