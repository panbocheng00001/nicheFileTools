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
          automated bulk fetching of tool pages or misrepresenting the
          Services as your own product.
        </li>
        <li>
          Do not interfere with, overload, or probe the Services or their
          infrastructure.
        </li>
      </ul>

      <h2>3. Free service &amp; unlock codes</h2>
      <p>
        All tools are free; there is no paid tier. The desktop application is
        gated per tool by a free, hourly unlock code shown on the matching
        page of this site (see{" "}
        <a href="/free-trial">How the unlock code works</a>). Codes are
        case-insensitive, rotate on the hour, and unlock only the tool whose
        page they came from.
      </p>

      <h2>4. Disclaimer of warranties</h2>
      <p>
        The Services are provided &ldquo;as is&rdquo; without warranty of any
        kind. Format conversion is inherently lossy for some formats; always
        keep a backup of your original files. We are not liable for data loss,
        corrupted output, or damages arising from use of the Services to the
        maximum extent permitted by law.
      </p>

      <h2>5. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, our aggregate liability
        arising from your use of the Services is limited to the amount you
        paid us in the twelve months preceding the claim (or zero for free
        services).
      </p>

      <h2>6. Changes</h2>
      <p>
        We may update these terms as the Services evolve. Continued use after
        an update constitutes acceptance. The date at the top of this page
        reflects the current version.
      </p>

      <h2>7. Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </DocPage>
  );
}
