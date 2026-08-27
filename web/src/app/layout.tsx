import { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { SITE, BRAND, SUPPORT_EMAIL } from "@/lib/site";

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

/** 全站 WebSite + Organization schema — 全站规范 §7.4 / 实体 SEO（附录 A「全站」行） */
const globalJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND,
    url: SITE,
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND,
    url: SITE,
    logo: `${SITE}/logo.png`,
    contactPoint: {
      "@type": "ContactPoint",
      email: SUPPORT_EMAIL,
      contactType: "customer support",
    },
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
        {/* 字体通过 <link> 在浏览器端加载，避免构建期联网拉取（沙箱无外网） */}
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
          {/* 环境背景三件套：固定层 + 网格 + 顶部荧光光晕 */}
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
