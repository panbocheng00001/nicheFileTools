import type { Metadata } from "next";
import { ArrowRight, Check, Download, Cpu, Layers, HardDrive } from "lucide-react";
import { REPO_NAME, REPO_OWNER, REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Download nichefiletools Desktop — Free File Converter",
  description:
    "Download the free nichefiletools desktop application for unlimited file sizes, batch conversion, and formats not supported in the browser (RAW to ISO, WAD).",
  alternates: { canonical: "/download" },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "nichefiletools Desktop",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Windows, macOS",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  downloadAction: {
    "@type": "DownloadAction",
    target: "https://nichefiletools.com/download",
  },
};

const features = [
  {
    icon: HardDrive,
    title: "Unlimited file sizes",
    body: "No browser memory limits — convert multi-GB disc images natively.",
  },
  {
    icon: Layers,
    title: "Batch conversion",
    body: "Process many files at once with a single queued job.",
  },
  {
    icon: Cpu,
    title: "Hardware-accelerated",
    body: "Native processing for CAD and 3D formats (PRT, BLEND).",
  },
  {
    icon: Download,
    title: "Desktop-only formats",
    body: "RAW to ISO, WAD extraction and more the browser can't handle.",
  },
];

export default function DownloadPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero */}
      <header className="text-center">
        <span className="mono-label">Free · Windows / macOS</span>
        <h1 className="mx-auto mt-3 max-w-3xl text-balance text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl">
          Download the{" "}
          <span className="bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
            Desktop App
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          For large files, batch jobs, and formats the browser cannot handle,
          the nichefiletools desktop application is free to download and use.
        </p>
        <a
          href="https://nichefiletools.com/download"
          className="mt-8 inline-flex items-center gap-1.5 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)]"
        >
          <Download className="h-4 w-4" />
          Download for Windows / macOS
        </a>
      </header>

      {/*Property Grid*/}
      <section className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="glass flex gap-4 p-6">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold tracking-tight text-foreground">
                  {f.title}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      {/*quick checklist*/}
      <section className="glass mt-6 p-6 sm:p-8">
        <h2 className="mb-4 font-mono text-sm font-bold uppercase tracking-widest text-foreground">
          What you get
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            "Unlimited file sizes — no browser memory limits",
            "Batch conversion for many files at once",
            "Hardware-accelerated processing for CAD and 3D formats",
            "Desktop-only formats: RAW to ISO, WAD extraction",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-success/15 text-success">
                <Check className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/*Free vs Pro — Site-wide specification §2.3 Edition Comparison (consistent with /pricing)*/}
      <section className="mt-6">
        <div className="glass p-6 sm:p-8">
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
            Free vs Pro Edition
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 font-mono text-sm uppercase tracking-widest text-muted-foreground">
                  <th className="py-3 pr-4">Feature</th>
                  <th className="px-3 py-3">Free</th>
                  <th className="px-3 py-3 text-primary">Pro</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["File size", "Unlimited", "Unlimited"],
                  ["Batch conversion", true, "Unlimited"],
                  ["Desktop-only formats", true, true],
                  ["Support", "Community (48h)", "Priority (12h)"],
                  ["Price", "Free hourly codes (per tool)", "One-time license"],
                ].map(([f, free, pro]) => (
                  <tr key={String(f)} className="border-b border-border/40">
                    <td className="py-3 pr-4 font-medium text-foreground">{f}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {free === true ? (
                        <span className="inline-grid h-5 w-5 place-items-center rounded-md bg-success/15 text-success">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        free
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {pro === true ? (
                        <span className="inline-grid h-5 w-5 place-items-center rounded-md bg-success/15 text-success">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        pro
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Every desktop tool unlocks with a free, hourly code copied from its
            page on this site. Details on the{" "}
            <a href="/pricing" className="font-medium text-primary hover:opacity-80">
              pricing
            </a>{" "}
            and{" "}
            <a href="/license" className="font-medium text-primary hover:opacity-80">
              license
            </a>{" "}
            pages.
          </p>
        </div>
      </section>

      {/*System Requirements — §2.3*/}
      <section className="glass mt-6 p-6 sm:p-8">
        <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
          System Requirements
        </h2>
        <ul className="mt-4 grid gap-2.5 text-sm text-muted-foreground sm:grid-cols-2">
          <li>Windows 10/11 (64-bit) or macOS 12+</li>
          <li>4 GB RAM (8 GB for multi-GB disc images)</li>
          <li>~50 MB free disk space for the app</li>
          <li>No internet connection required after install</li>
          <li className="sm:col-span-2">
            Optional free engines power seven tools (FFmpeg, Blender, Calibre,
            FreeCAD, Python) —{" "}
            <a
              href="/help/engines"
              className="font-medium text-primary underline underline-offset-4 transition-opacity hover:opacity-80"
            >
              read the illustrated install guide
            </a>
          </li>
        </ul>
      </section>

      {/*Third-party engine install guide — entry next to the download CTA*/}
      <section className="glass-panel mt-6 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
            Need FFmpeg, Blender, Calibre or FreeCAD?
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Seven desktop tools borrow power from free open-source engines.
            Install them in one command — the step-by-step{" "}
            <a
              href="/help/engines"
              className="font-medium text-primary underline underline-offset-4 transition-opacity hover:opacity-80"
            >
              engine install guide
            </a>{" "}
            covers Windows and macOS, with screenshots, verification commands
            and troubleshooting.
          </p>
        </div>
        <a
          href="/help/engines"
          className="mono-label inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background/60 px-4 py-2.5 text-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
        >
          View the guide <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </section>

      {/*Security & Privacy — §2.3 Security & Privacy (Trust Oriented)*/}
      <section className="glass mt-6 p-6 sm:p-8">
        <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
          Security You Can Trust
        </h2>
        <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-primary">▹</span> All processing is local —
            the app converts offline and sends no telemetry.
          </li>
          <li className="flex gap-2">
            <span className="text-primary">▹</span> Unlock codes are verified
            <strong> on your machine</strong> — no network call, no account.
            The only outbound request is the occasional update check.
          </li>
          <li className="flex gap-2">
            <span className="text-primary">▹</span> Fully open source: read the
            conversion kernels and the unlock algorithm yourself at{" "}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:opacity-80"
            >
              github.com/{REPO_OWNER}/{REPO_NAME}
            </a>
            .
          </li>
        </ul>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
