import type { Metadata } from "next";
import { DocPage } from "@/components/DocPage";
import { SUPPORT_EMAIL, HELLO_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get help with nichefiletools: support email, general inquiries. Typical response within 24-48 hours.",
  alternates: { canonical: "/contact" },
  robots: { index: true, follow: true },
};

const contactJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact nichefiletools",
  url: "https://nichefiletools.com/contact",
};

export default function ContactPage() {
  return (
    <>
      <DocPage eyebrow="Contact" title="Get in touch">
        <p>
          We read every message. Pick the address that matches your question —
          it speeds things up.
        </p>

        <h2>Support &amp; bug reports</h2>
        <p>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          <br />
          Conversion failures, unlock-key issues, desktop app problems.
          Include your OS, browser, file size, and the exact error text.
          Response: within 48 hours (12 hours for paid licenses).
        </p>

        <h2>General &amp; partnership</h2>
        <p>
          <a href={`mailto:${HELLO_EMAIL}`}>{HELLO_EMAIL}</a>
          <br />
          Format requests, press, licensing, and partnerships.
        </p>

        <h2>Security reports</h2>
        <p>
          Found a potential security issue? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with the
          subject line &ldquo;SECURITY&rdquo;. We credit responsible
          disclosures and respond quickly.
        </p>

        <h2>Self-service first?</h2>
        <p>
          Many answers are already online: the{" "}
          <a href="/support">support center</a> lists response times and
          common fixes, and the <a href="/convert">conversion guides</a>{" "}
          cover step-by-step usage for every format.
        </p>
      </DocPage>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
    </>
  );
}
