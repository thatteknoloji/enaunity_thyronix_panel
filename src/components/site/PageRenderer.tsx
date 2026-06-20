import type { PageTemplate } from "@/lib/pages/types";
import DefaultPageTemplate from "./templates/DefaultPageTemplate";
import FaqPageTemplate from "./templates/FaqPageTemplate";
import ContactPageTemplate from "./templates/ContactPageTemplate";
import PolicyPageTemplate from "./templates/PolicyPageTemplate";
import { parseFaqContent } from "@/lib/pages/faq-parser";

type PageRendererProps = {
  template: PageTemplate;
  content: string;
  contactSettings?: {
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
  };
};

export default function PageRenderer({ template, content, contactSettings }: PageRendererProps) {
  switch (template) {
    case "faq": {
      const { introHtml, items } = parseFaqContent(content);
      return <FaqPageTemplate introHtml={introHtml} items={items} />;
    }
    case "contact":
      return (
        <ContactPageTemplate
          content={content}
          contactEmail={contactSettings?.contactEmail || ""}
          contactPhone={contactSettings?.contactPhone || ""}
          address={contactSettings?.address || ""}
        />
      );
    case "policy":
      return <PolicyPageTemplate content={content} />;
    default:
      return <DefaultPageTemplate content={content} />;
  }
}
