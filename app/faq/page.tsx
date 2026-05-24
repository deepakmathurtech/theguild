import ContentPage from "@/components/guild/ContentPage";
import { pageMetadata } from "@/lib/site";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "FAQ",
  path: "/faq",
});

export default function FAQPage() {
  return <ContentPage slug="faq" />;
}
