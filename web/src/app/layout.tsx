import { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { SITE, BRAND, SUPPORT_EMAIL, REPO_URL, LICENSE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: "nichefiletools — Free Online File Converters",
    template: "%s | nichefiletools",
  },
  description:
    "Free online file conversion tools. 100% browser-based, private, and secure — your files never leave your device.",
  metadataBase: new URL(SITE),
  robots: { index: true, follow: true },
  openGraph: {
    siteName: BRAND,
    type: "website",
    url: SITE,
  },
  twitter: { card: "summary_large_image" },
};

/**
 * Full-site WebSite + Organization + SoftwareSourceCode schema.
 *
 * Full-site specification §7.4 / Entity SEO (Appendix A "Full-site" line).
 *
 * `sameAs` is the load-bearing field here: it lets Google tie the
 * "nichefiletools" entity to a real, verifiable GitHub profile instead of
 * guessing. The repository is also described as `SoftwareSourceCode` so the
 * open-source claim is machine-readable, not just marketing copy.
 */
const globalJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND,
    url: SITE,
    publisher: { "@type": "Organization", name: BRAND, url: SITE },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND,
    url: SITE,
    logo: `${SITE}/logo.png`,
    sameAs: [REPO_URL],
    contactPoint: {
      "@type": "ContactPoint",
      email: SUPPORT_EMAIL,
      contactType: "customer support",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: BRAND,
    description:
      "Open-source file converters: browser-based web app plus a Tauri 2 desktop app with native Rust conversion kernels.",
    codeRepository: REPO_URL,
    programmingLanguage: ["TypeScript", "Rust"],
    runtimePlatform: ["Web Browser", "Windows", "macOS", "Linux"],
    // MIT — LICENSE file landed 2026-08-30; also see THIRD_PARTY_NOTICES.md
    // for the per-dependency license breakdown (FFmpeg WASM is LGPL-2.1+).
    license: LICENSE_URL,
    author: { "@type": "Organization", name: BRAND, url: SITE },
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {/*Fonts are loaded on the browser side through <link> to avoid pulling from the Internet during the build period (the sandbox does not have an external network)*/}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />

        <ThemeProvider>
          {/*Environmental background three-piece set: fixed layer + grid + top fluorescent halo*/}
          <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className="ambient-grid absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_140%_120%_at_50%_0%,#000_70%,transparent_100%)]" />
            <div className="absolute top-[-5%] left-1/2 h-[500px] w-full max-w-4xl -translate-x-1/2 rounded-full bg-primary/10 blur-[150px]" />
          </div>

          <Suspense fallback={null}>
            <Navbar />
          </Suspense>

          <PageTransition>
            <div className="flex-1">{children}</div>
          </PageTransition>

          <Footer />
        </ThemeProvider>

        {globalJsonLd.map((s, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
          />
        ))}
      </body>
    </html>
  );
}
