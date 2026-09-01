import type { Metadata } from "next";
import Link from "next/link";
import { DocPage } from "@/components/DocPage";

export const metadata: Metadata = {
  title: "License: Unlock Codes & Activation",
  description:
    "How the nichefiletools desktop unlock works: copy the hourly code, paste to activate, fully offline. No account, no device binding. Fixes for expired codes.",
  alternates: { canonical: "/license" },
  robots: { index: true, follow: true },
};

export default function LicensePage() {
  return (
    <DocPage eyebrow="Licensing" title="Unlock Codes & Activation">
      <p>
        The desktop app is gated per tool by a free, hourly code copied from
        the matching page on this site. There is nothing to buy, no account to
        create, and no device binding — activation is a paste, verified
        entirely offline on your machine.
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

      <h2>Why this design</h2>
      <p>
        The whole nichefiletools stack — web app, desktop app, and Rust
        converters — is open source, so a server-side &ldquo;secret&rdquo;
        could not stay secret for long. A public, time-bucketed code sidesteps
        that problem: there is no secret, no licensing server to phone home,
        and the user must look at a tool page (the most useful place on the
        internet to learn about a tool) once an hour.
      </p>

      <h2>Troubleshooting</h2>
      <ul>
        <li>
          <em>&ldquo;That code is not valid for this tool right now&rdquo;</em>{" "}
          — the code is per tool and per hour. Open the matching page on this
          site and copy the current code (it rotates on the hour). Also check
          you copied the code from the same tool&rsquo;s page, not a
          different tool.
        </li>
        <li>
          <em>&ldquo;This tool is locked&rdquo;</em> — paste the current code
          from its page. The lock lifts immediately.
        </li>
        <li>
          <em>Worked a minute ago, locked now</em> — the hour rolled over.
          Codes refresh on the UTC hour; grab the new one from the same page.
        </li>
        <li>
          Still stuck? <Link href="/support">Support center</Link>.
        </li>
      </ul>
    </DocPage>
  );
}
