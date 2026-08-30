import type { Metadata } from "next";
import Link from "next/link";
import { DocPage } from "@/components/DocPage";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "License & Activation",
  description:
    "How the nichefiletools desktop app is unlocked: an hourly, per-tool code copied from this site, plus a paid license for unlimited use.",
  alternates: { canonical: "/license" },
  robots: { index: true, follow: true },
};

export default function LicensePage() {
  return (
    <DocPage eyebrow="Licensing" title="License & Activation">
      <p>
        The desktop app is gated per tool by a free, hourly code copied from
        the matching page on this site. There is also a paid license that
        removes all limits. This page explains both.
      </p>

      <h2>Hourly unlock code (free, per tool)</h2>
      <p>
        Every tool page on this site — for example{" "}
        <Link href="/tools/kfx-to-epub">/tools/kfx-to-epub</Link> — shows a
        small card with an 8-character code and a live countdown to the next
        refresh. Inside the desktop app, each tool card has the same field:
        paste the code and the tool unlocks for the rest of the hour.
      </p>
      <p>Rules:</p>
      <ul>
        <li>Codes rotate on the hour (UTC) and are case-insensitive.</li>
        <li>
          A code is per tool — the KFX → EPUB code only unlocks KFX → EPUB.
          Other tools stay locked.
        </li>
        <li>
          Within an hour there is no conversion cap. When the countdown hits
          zero the tool locks again; copy the new code and keep going.
        </li>
        <li>
          The algorithm is public (see <Link href="/free-trial">/free-trial</Link>)
          because the whole project is open source — this is a convenience
          gate, not a security boundary.
        </li>
      </ul>

      <h2>Paid license</h2>
      <p>
        A paid license removes the need to re-grab codes every hour. It is a
        one-time purchase (see <Link href="/pricing">Pricing</Link>) — no
        subscription. After purchase you receive a license key by email.
      </p>

      <h2>Why this design</h2>
      <p>
        The whole nichefiletools stack — web app, desktop app, and Rust
        converters — is open source, so a server-side “secret” could not stay
        secret for long. A public, time-bucketed code sidesteps that
        problem: there is no secret, and the user must look at a tool page
        (the most useful place on the internet to learn about a tool) once an
        hour.
      </p>

      <h2>Recovering a paid license</h2>
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
          <em>&ldquo;That code is not valid for this tool right now&rdquo;</em>{" "}
          — the code is per tool and per hour. Open the matching page on this
          site and copy the current code (it rotates on the hour).
        </li>
        <li>
          <em>&ldquo;This tool is locked&rdquo;</em> — paste the current code
          from its page. The lock lifts immediately.
        </li>
        <li>
          Still stuck? <Link href="/support">Support center</Link>.
        </li>
      </ul>
    </DocPage>
  );
}
