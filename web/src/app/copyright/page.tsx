import type { Metadata } from "next";
import { DocPage } from "@/components/DocPage";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Copyright & DMCA",
  description:
    "Copyright policy and DMCA takedown procedure for nichefiletools. How to report infringement and what we do with valid notices.",
  alternates: { canonical: "/copyright" },
  robots: { index: true, follow: true },
};

export default function CopyrightPage() {
  return (
    <DocPage eyebrow="Legal" title="Copyright &amp; DMCA">
      <p>
        nichefiletools respects intellectual property rights. Our tools process
        files entirely on your device — we do not host, store, or distribute
        user content. This page explains our copyright policy and how rights
        holders can submit a DMCA takedown notice.
      </p>

      <h2>Your responsibility</h2>
      <p>
        You may only convert files you own or are authorized to process. Do not
        use nichefiletools to infringe copyright, circumvent DRM, or redistribute
        protected works. See our{" "}
        <a href="/terms">Terms of Service</a> for acceptable use.
      </p>

      <h2>What we host</h2>
      <p>
        The website publishes documentation, conversion guides, and software
        downloads maintained by nichefiletools. We do not operate a file-sharing
        or user-upload platform. If you believe material on this site (for example
        a guide page or downloadable asset) infringes your copyright, follow the
        procedure below.
      </p>

      <h2>DMCA takedown notice</h2>
      <p>
        To submit a notice under the U.S. Digital Millennium Copyright Act
        (DMCA), email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{" "}
        with all of the following:
      </p>
      <ul>
        <li>
          Your physical or electronic signature (typed name is acceptable).
        </li>
        <li>
          Identification of the copyrighted work you claim has been infringed.
        </li>
        <li>
          The exact URL on nichefiletools.com where the allegedly infringing
          material appears.
        </li>
        <li>
          Your contact information: name, mailing address, telephone number, and
          email address.
        </li>
        <li>
          A statement that you have a good-faith belief the use is not
          authorized by the copyright owner, its agent, or the law.
        </li>
        <li>
          A statement, under penalty of perjury, that the information in the
          notice is accurate and that you are the copyright owner or authorized
          to act on the owner&apos;s behalf.
        </li>
      </ul>

      <h2>Counter-notification</h2>
      <p>
        If you believe content was removed in error, you may submit a
        counter-notification to the same email address with the information
        required by 17 U.S.C. § 512(g)(3). We will forward it to the original
        complainant as the law requires.
      </p>

      <h2>Repeat infringers</h2>
      <p>
        Where applicable, we may terminate access for users who repeatedly
        infringe copyright after appropriate notice.
      </p>

      <h2>Contact</h2>
      <p>
        Copyright questions or DMCA notices:{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. General
        inquiries: <a href="/contact">contact page</a>.
      </p>
    </DocPage>
  );
}
