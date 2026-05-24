import ContentPage from "@/components/guild/ContentPage";
import { pageMetadata } from "@/lib/site";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Terms",
  path: "/terms",
});

export default function TermsPage() {
  return <ContentPage slug="terms" />;
}
