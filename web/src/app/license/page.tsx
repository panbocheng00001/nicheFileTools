import type { Metadata } from "next";
import Link from "next/link";
import { DocPage } from "@/components/DocPage";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "License & Activation",
  description:
    "How to get, activate, and manage your nichefiletools desktop license key. Free unlock keys, device binding & recovery explained.",
  alternates: { canonical: "/license" },
  robots: { index: true, follow: true },
};

export default function LicensePage() {
  return (
    <DocPage eyebrow="Licensing" title="License & Activation">
      <p>
        There are two kinds of keys in nichefiletools: the free 2-attempt
        unlock key, and a paid license. They work differently — here is
        exactly how.
      </p>

      <h2>Free unlock key (2 conversions)</h2>
      <p>
        Inside the desktop app, click <strong>Free unlock</strong>. You get
        two ways to receive your key:
      </p>
      <ol>
        <li>
          <strong>Open directly in browser</strong> — one click opens the
          unlock page and your key is displayed immediately.
        </li>
        <li>
          <strong>Copy link</strong> — copy the link and open it later, or on
          your phone, then copy the key back to the desktop app.
        </li>
      </ol>
      <p>
        Paste the key into the app&rsquo;s <em>Enter Unlock Key</em> field and
        click <em>Apply Key</em>. Rules: each key is single-use, expires after
        24 hours, and <strong>one free unlock is allowed per device</strong>.
      </p>

      <h2>Paid license</h2>
      <p>
        A paid license removes all conversion limits on the desktop app. It is
        a one-time purchase (see <Link href="/pricing">Pricing</Link>) — no
        subscription. After purchase you receive a license key by email.
      </p>

      <h2>Device binding</h2>
      <p>
        Keys are bound to a random device identifier created on your machine.
        The identifier contains no personal information — it exists only to
        enforce the one-free-unlock-per-device rule and to protect your paid
        license from sharing. See the{" "}
        <Link href="/privacy">Privacy Policy</Link> for details.
      </p>

      <h2>Recovering a license</h2>
      <ul>
        <li>
          <strong>Same computer, reinstalled OS?</strong> Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your
          purchase receipt and we will re-issue the key.
        </li>
        <li>
          <strong>New computer?</strong> Each license covers one machine;
          contact us to transfer it.
        </li>
        <li>
          <strong>Lost the email?</strong> We can resend it to the address you
          purchased with.
        </li>
      </ul>

      <h2>Troubleshooting</h2>
      <ul>
        <li>
          <em>&ldquo;Invalid or expired key&rdquo;</em> — free keys expire
          after 24 hours and work only once. Request a fresh one in the app.
        </li>
        <li>
          <em>&ldquo;Device already claimed&rdquo;</em> — the free unlock was
          already used on this machine. A paid license unlocks unlimited use.
        </li>
        <li>
          Still stuck? <Link href="/support">Support center</Link>.
        </li>
      </ul>
    </DocPage>
  );
}
