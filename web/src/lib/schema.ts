import type { ToolContent } from "./tools-data";

const SITE = "https://nichefiletools.com";

type JsonLd = Record<string, unknown>;

/** SoftwareApplication schema. A class => operatingSystem "Web"; B class => "Web, Windows, macOS". */
export function softwareAppSchema(tool: ToolContent): JsonLd {
  const base: JsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.h1,
    applicationCategory: "MultimediaApplication",
    description: tool.metaDescription,
    featureList: [
      "No upload required",
      tool.className === "A"
        ? "100% browser-based, private"
        : "Unlimited file size on desktop",
      `Supports ${tool.sourceFormat} format`,
    ],
    author: {
      "@type": "Organization",
      name: "nichefiletools",
      url: `${SITE}/about`,
    },
  };

  if (tool.className === "A") {
    return {
      ...base,
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    };
  }

  return {
    ...base,
    operatingSystem: "Web, Windows, macOS",
    offers: [
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      {
        "@type": "Offer",
        name: "nichefiletools Desktop (Free)",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStoreOnly",
      },
    ],
  };
}

export function breadcrumbSchema(tool: ToolContent): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: tool.categoryLabel,
        item: `${SITE}/category/${tool.category}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: tool.h1,
        item: `${SITE}/tools/${tool.slug}`,
      },
    ],
  };
}

export function faqSchema(tool: ToolContent): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: tool.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
