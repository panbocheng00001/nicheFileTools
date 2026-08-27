import type { Metadata } from "next";
import { DocPage } from "@/components/DocPage";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "What cookies nichefiletools uses, why, and how to manage your preferences.",
  alternates: { canonical: "/cookie" },
  robots: { index: true, follow: true },
};

export default function CookiePage() {
  return (
    <DocPage eyebrow="Legal" title="Cookie Policy">
      <p>
        nichefiletools does <strong>not use tracking or advertising
        cookies</strong>. This page explains the (very little) browser storage
        we rely on, in the spirit of the EU ePrivacy Directive and GDPR.
      </p>

      <h2>Strictly necessary storage</h2>
      <ul>
        <li>
          <strong>Theme preference.</strong> We remember whether you chose
          light or dark mode. This value is stored in your browser&rsquo;s
          localStorage and never leaves your device.
        </li>
        <li>
          <strong>Desktop unlock state.</strong> The desktop application stores
          your free-quota count locally on your computer. This never reaches
          the web session.
        </li>
      </ul>

      <h2>What we do NOT use</h2>
      <ul>
        <li>No analytics cookies (no Google Analytics or similar).</li>
        <li>No advertising or retargeting cookies.</li>
        <li>No third-party trackers or fingerprinting.</li>
      </ul>

      <h2>URL parameters</h2>
      <p>
        Links from the desktop app to the unlock page may include a{" "}
        <code>token</code> and a <code>utm_source</code> parameter. These exist
        only to deliver your one-time unlock key and to tell apart the two
        entry paths (&ldquo;opened directly&rdquo; vs &ldquo;copied
        link&rdquo;). Tokens expire after 24 hours and are single-use. See our{" "}
        <a href="/privacy">Privacy Policy</a> for the data involved.
      </p>

      <h2>If we ever add analytics</h2>
      <p>
        Should we introduce measurement cookies in the future, we will deploy
        a consent banner first, keep cookies strictly categorized (necessary /
        analytics), and update this page before any change takes effect. You
        will always be able to refuse non-essential cookies.
      </p>

      <h2>Managing storage</h2>
      <p>
        You can clear the theme preference at any time via your
        browser&rsquo;s &ldquo;clear site data&rdquo; function. Doing so will
        not break any feature — the site simply falls back to your system
        theme.
      </p>
    </DocPage>
  );
}
