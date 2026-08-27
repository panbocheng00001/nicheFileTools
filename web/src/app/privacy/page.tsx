import type { Metadata } from "next";
import { DocPage } from "@/components/DocPage";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How nichefiletools collects, uses, and protects your data. 100% local conversion, GDPR & CCPA compliant. Manage your rights.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <DocPage eyebrow="Legal" title="Privacy Policy">
      <p>
        nichefiletools is built privacy-first: every online conversion runs
        inside your browser with WebAssembly. <strong>Your files are never
        uploaded to our servers</strong> — we cannot see, store, or access
        them. This policy explains the small amount of data we do process.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Nothing for online conversions.</strong> Files you convert in
          the browser are processed entirely on your device and are discarded
          the moment you close the tab.
        </li>
        <li>
          <strong>Desktop unlock tokens.</strong> If you request a free desktop
          unlock key, our server generates a one-time token and stores a{" "}
          <em>hashed device identifier</em> (a random UUID created on your
          machine) to enforce the one-free-key-per-device limit. The hash
          contains no personal information and cannot be traced back to you.
        </li>
        <li>
          <strong>Basic server logs.</strong> Like most websites, our hosting
          provider records request IPs and timestamps for security and abuse
          prevention. Logs are retained for a short period and are not used to
          profile you.
        </li>
      </ul>

      <h2>What we never do</h2>
      <ul>
        <li>We never upload, read, or share your files.</li>
        <li>We do not sell or rent personal data — to anyone.</li>
        <li>We do not run advertising or cross-site tracking cookies.</li>
        <li>The desktop app works fully offline and sends no telemetry.</li>
      </ul>

      <h2>Cookies &amp; local storage</h2>
      <p>
        We use no tracking cookies. The only browser storage we use is a
        local-theme preference (light/dark), which stays on your device. See our{" "}
        <a href="/cookie">Cookie Policy</a> for details.
      </p>

      <h2>Your rights (GDPR / CCPA)</h2>
      <p>
        Depending on your jurisdiction, you have the right to access, correct,
        export, or delete personal data we hold about you, and to object to
        processing. Because we store almost nothing, most requests are
        resolved by confirming that no data exists. To exercise any right,
        email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> — we
        respond within 30 days.
      </p>

      <h2>Children&rsquo;s privacy</h2>
      <p>
        nichefiletools is not directed at children under 13 (16 in the EEA),
        and we do not knowingly collect their personal data.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we change this policy, we will update the date at the top of this
        page. Material changes (for example, if we ever add analytics) will be
        announced on this site before they take effect.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or use our{" "}
        <a href="/contact">contact page</a>.
      </p>
    </DocPage>
  );
}
