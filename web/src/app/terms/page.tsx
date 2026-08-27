import type { Metadata } from "next";
import { DocPage } from "@/components/DocPage";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of nichefiletools's website, web tools, and desktop software.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <DocPage eyebrow="Legal" title="Terms of Service">
      <p>
        By using nichefiletools (the &ldquo;Services&rdquo;), you agree to
        these terms. If you do not agree, please do not use the Services.
      </p>

      <h2>1. The services</h2>
      <p>
        nichefiletools provides free browser-based file conversion tools and a
        desktop application. Online tools run locally in your browser; the
        desktop application runs on your computer. In neither case are your
        files transmitted to us for conversion.
      </p>

      <h2>2. Acceptable use</h2>
      <ul>
        <li>
          Only convert files you own or are authorized to process.
        </li>
        <li>
          Do not use the Services to infringe copyright or circumvent DRM or
          other copy protection. Some source formats (for example protected
          ebooks) cannot and will not be processed.
        </li>
        <li>
          Do not attempt to abuse the free desktop unlock system, including
          automated requests, device-identifier manipulation, or reselling
          keys.
        </li>
        <li>
          Do not interfere with, overload, or probe the Services or their
          infrastructure.
        </li>
      </ul>

      <h2>3. Free tier &amp; licenses</h2>
      <p>
        Online tools are free. The desktop application includes a one-time
        free unlock of <strong>2 conversion attempts per device</strong>,
        delivered through a single-use key that expires after 24 hours. After
        the free attempts are consumed, continued desktop use requires a paid
        license (see <a href="/pricing">Pricing</a>). One free unlock is
        permitted per device; abusing this limit may result in refusal of
        service.
      </p>

      <h2>4. Paid licenses</h2>
      <p>
        Paid licenses are a one-time purchase, bound to a device as described
        on the <a href="/license">License page</a>, and include the update
        window stated at purchase. License keys are personal and may not be
        shared or resold. Refunds are handled per applicable consumer law;
        contact us within 14 days of purchase if the software does not work as
        described.
      </p>

      <h2>5. Disclaimer of warranties</h2>
      <p>
        The Services are provided &ldquo;as is&rdquo; without warranty of any
        kind. Format conversion is inherently lossy for some formats; always
        keep a backup of your original files. We are not liable for data loss,
        corrupted output, or damages arising from use of the Services to the
        maximum extent permitted by law.
      </p>

      <h2>6. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, our aggregate liability
        arising from your use of the Services is limited to the amount you
        paid us in the twelve months preceding the claim (or zero for free
        services).
      </p>

      <h2>7. Changes</h2>
      <p>
        We may update these terms as the Services evolve. Continued use after
        an update constitutes acceptance. The date at the top of this page
        reflects the current version.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </DocPage>
  );
}
