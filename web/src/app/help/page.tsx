import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Download,
  UploadCloud,
  Lock,
  Zap,
  Monitor,
  ChevronDown,
  CircleHelp,
  Check,
  KeyRound,
  Layers,
} from "lucide-react";
import { TOOLS, type ToolContent } from "@/lib/tools-data";
import { CATEGORIES } from "@/lib/site";
import { getGuide } from "@/lib/convert-content";
import { ZoomableImage, type LightboxImage } from "@/components/Lightbox";

export const metadata: Metadata = {
  title: "Help Center — nichefiletools",
  description:
    "How nichefiletools works: private, in-browser file conversion in three steps. Compare the free web tool with the desktop app, see size limits, browse every converter, and fix common problems.",
  alternates: { canonical: "/help" },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Do my files get uploaded to a server?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. All conversion happens locally in your browser. Files are read and written on your own device and never leave it.",
      },
    },
    {
      "@type": "Question",
      name: "What is the maximum file size on the web tool?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The free web tool processes files up to a per-tool limit shown on each tool page. For unlimited size and batch jobs, use the free desktop app.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need an account?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No account, no sign-up. Open a tool and convert.",
      },
    },
    {
      "@type": "Question",
      name: "Which formats need the desktop app?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "RAW disc images, WAD archives, BLEND models, KFX ebooks, PRT/STL CAD files, and some PFB/Type-1 fonts require the free desktop app because browsers cannot run the required engines.",
      },
    },
  ],
};

/** Interface-tour screenshots: opened as one lightbox group so they can be paged through. */
const TOUR_SHOTS: LightboxImage[] = [
  {
    src: "/help/file-converter-tools-grid.png",
    alt: "Tool grid showing converters grouped by category with A/B/C class badges and a guide icon on each card",
    caption:
      "Tool grid: every card shows the format pair, its class badge, and a guide icon in the top-right corner.",
  },
  {
    src: "/help/exr-to-png-converter-interface.png",
    alt: "In-browser converter with file selector, supported formats, and a Convert button",
    caption:
      "Converter page: drag or select a file, then hit Convert. The unlock code panel appears only for desktop-capable formats.",
  },
  {
    src: "/help/exr-to-png-conversion-guide.png",
    alt: "The EXR to PNG conversion guide with methods table and step-by-step instructions",
    caption:
      "Conversion guide: what the format is, methods compared, known limits, and click-by-click instructions.",
  },
];

const TOC = [
  { id: "how-it-works", label: "How it works" },
  { id: "privacy", label: "Privacy" },
  { id: "tour", label: "Interface tour" },
  { id: "compare", label: "Web vs Desktop" },
  { id: "tools", label: "All tools" },
  { id: "desktop-app", label: "Desktop & unlock code" },
  { id: "troubleshooting", label: "Troubleshooting" },
  { id: "faq", label: "FAQ" },
];

export default function HelpPage() {
  return (
    <main className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 ambient-grid opacity-40" />

      {/* ================= HERO ================= */}
      <header className="border-b border-border/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="mono-label inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-primary">
            <CircleHelp className="h-3.5 w-3.5" /> Help Center
          </p>

          <h1 className="mt-5 max-w-3xl text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
            Convert files on your own device —{" "}
            <span className="text-primary">no upload, no account.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            nichefiletools runs entirely on your machine. The browser handles
            quick jobs; the free desktop app covers the heavy formats and
            unlimited file sizes.
          </p>

          {/* three-step strip */}
          <div className="mt-10">
            <ThreeStepDiagram />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/tools"
              className="mono-label inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-primary-foreground transition-opacity hover:opacity-90"
            >
              Browse tools <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/download"
              className="mono-label inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-4 py-2.5 text-foreground backdrop-blur-sm transition-colors hover:bg-muted/60"
            >
              Get desktop app <Download className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ================= BODY: TOC + SECTIONS ================= */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
          {/* sticky table of contents */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="mono-label mb-3 text-primary">On this page</p>
              <nav aria-label="Table of contents">
                <ul className="space-y-px border-l border-border">
                  {TOC.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </aside>

          {/* sections */}
          <div className="min-w-0">
            {/* ---------- HOW IT WORKS ---------- */}
            <Section
              id="how-it-works"
              eyebrow="How it works"
              title="Three steps, zero setup"
              lead="Pick a tool, drop a file, download the result. Everything happens inside your browser tab — there is no queue, no email, and no waiting for a server."
            >
              <div className="grid items-start gap-8 lg:grid-cols-2">
                <ol className="space-y-3">
                  <StepCard
                    n={1}
                    icon={BookOpen}
                    title="Choose a converter"
                    body="Browse the tool grid or search by format. Every card carries a book icon that opens the full guide for that format."
                  />
                  <StepCard
                    n={2}
                    icon={UploadCloud}
                    title="Drop your file"
                    body="Drag & drop or click Select File. The file is read from your disk and stays there — nothing is uploaded."
                  />
                  <StepCard
                    n={3}
                    icon={Download}
                    title="Download the result"
                    body="Hit Convert and save the output. If a format needs the desktop app, you get a clear upgrade path instead of a vague error."
                  />
                </ol>

                <BrowserFrame
                  src="/help/exr-to-png-converter-interface.png"
                  alt="The EXR to PNG converter showing the drag-and-drop area and the desktop unlock code panel"
                  caption="The converter: drop a file, convert locally, copy the unlock code if you need the desktop app."
                />
              </div>
            </Section>

            {/* ---------- PRIVACY ---------- */}
            <Section
              id="privacy"
              eyebrow="Privacy"
              title="Private by design"
              lead="We physically cannot see your files — the conversion code runs on your device, not on our servers."
            >
              <div className="glass overflow-hidden">
                <div className="grid lg:grid-cols-2">
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-2 text-primary">
                      <ShieldCheck className="h-5 w-5" />
                      <p className="mono-label text-primary">
                        Local processing
                      </p>
                    </div>
                    <p className="mt-4 text-xl font-bold tracking-tight text-foreground">
                      Your bytes never leave the machine.
                    </p>
                    <p className="mt-3 leading-relaxed text-muted-foreground">
                      The page reads your file with the browser File API,
                      converts it with JavaScript or WebAssembly, and hands the
                      result straight back to your Downloads folder. No server
                      ever receives the data. Once the page has loaded you can
                      even disconnect from the internet and keep converting.
                    </p>
                    <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
                      <CheckItem text="No cloud upload" />
                      <CheckItem text="No account or sign-up" />
                      <CheckItem text="Works offline after first load" />
                      <CheckItem text="Sensitive documents stay on your device" />
                    </ul>
                  </div>

                  <div className="flex min-h-[240px] items-center justify-center border-t border-border/40 bg-muted/30 p-6 lg:border-l lg:border-t-0">
                    <PrivacyDiagram />
                  </div>
                </div>
              </div>
            </Section>

            {/* ---------- INTERFACE TOUR ---------- */}
            <Section
              id="tour"
              eyebrow="Interface tour"
              title="What you'll see"
              lead="The tool grid groups every converter by category; each guide explains the format, compares methods, and lists the exact limits."
            >
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {TOUR_SHOTS.map((shot) => (
                  <BrowserFrame
                    key={shot.src}
                    src={shot.src}
                    alt={shot.alt}
                    caption={shot.caption ?? ""}
                    group={TOUR_SHOTS}
                  />
                ))}
              </div>
              <p className="mt-4 font-mono text-sm text-muted-foreground/70">
                Tip: click any screenshot to open it full size — then scroll to
                zoom, drag to pan, or use the arrow keys to move between shots.
              </p>
            </Section>

            {/* ---------- WEB VS DESKTOP ---------- */}
            <Section
              id="compare"
              eyebrow="Choose your workflow"
              title="Web vs Desktop"
              lead="Use the web tool for quick one-off conversions. Use the desktop app when a file is large, batch is needed, or the format requires an engine browsers cannot run."
            >
              <SizeDiagram />

              <div className="mt-6 overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-4 py-3 font-mono text-sm font-bold uppercase tracking-widest text-primary">
                        Feature
                      </th>
                      <th className="px-4 py-3 font-mono text-sm font-bold uppercase tracking-widest text-primary">
                        Web tool
                      </th>
                      <th className="px-4 py-3 font-mono text-sm font-bold uppercase tracking-widest text-primary">
                        Desktop app
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-muted-foreground">
                    <CompareRow
                      feature="Install"
                      web="None — runs in browser"
                      desktop="Free download"
                    />
                    <CompareRow
                      feature="File size"
                      web="Per-tool limit, shown on each page"
                      desktop="Unlimited"
                    />
                    <CompareRow
                      feature="Account"
                      web="Not required"
                      desktop="Not required"
                    />
                    <CompareRow
                      feature="Batch / queue"
                      web="One file at a time"
                      desktop="Batch queue"
                    />
                    <CompareRow
                      feature="Works offline"
                      web="After first page load"
                      desktop="Fully offline"
                    />
                    <CompareRow
                      feature="RAW, WAD, BLEND, KFX, CAD"
                      web="Not supported"
                      desktop="Supported (needs free sidecar engines)"
                    />
                  </tbody>
                </table>
              </div>
            </Section>

            {/* ---------- ALL TOOLS ---------- */}
            <Section
              id="tools"
              eyebrow={`${TOOLS.length} converters`}
              title="All tools"
              lead="Every converter is grouped by category. Click a name to open the tool, or the book icon to read its guide."
            >
              <div className="space-y-8">
                {CATEGORIES.map((c) => {
                  const items = TOOLS.filter((t) => t.category === c.slug);
                  if (!items.length) return null;
                  return (
                    <div key={c.slug}>
                      <div className="flex items-center gap-3">
                        <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-primary">
                          {c.label}
                        </h3>
                        <span className="h-px flex-1 bg-border" />
                        <span className="mono-label">{items.length}</span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {items.map((t) => (
                          <ToolRow key={t.slug} tool={t} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* ---------- DESKTOP & UNLOCK CODE ---------- */}
            <Section
              id="desktop-app"
              eyebrow="Desktop & unlock code"
              title="Unlocking desktop conversions"
              lead="The desktop app is free. A handful of formats open with a free hourly code generated right on the tool's web page — no payment, no account."
            >
              <ol className="grid gap-3 sm:grid-cols-3">
                <MiniStep
                  n={1}
                  icon={Layers}
                  title="Open the tool page"
                  body="Each web tool shows a free unlock code in its desktop panel. Copy it."
                />
                <MiniStep
                  n={2}
                  icon={KeyRound}
                  title="Paste in the app"
                  body="In the desktop app, pick the same tool and paste the code."
                />
                <MiniStep
                  n={3}
                  icon={Zap}
                  title="Convert"
                  body="The tool unlocks for that hour. Codes rotate on the hour, per tool."
                />
              </ol>

              <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5">
                <p className="mono-label text-primary">Sidecar engines</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Some desktop formats call free, open-source engines that run as
                  separate processes — FFmpeg (audio/video), Blender (BLEND),
                  Calibre (KFX), FreeCAD/OpenCASCADE (CAD), FontForge (Type 1
                  fonts), and Python + pandas (SPSS). If one is missing, the app
                  tells you which and links to the installer. None of it is
                  bundled or paid.
                </p>
              </div>
            </Section>

            {/* ---------- TROUBLESHOOTING ---------- */}
            <Section
              id="troubleshooting"
              eyebrow="Troubleshooting"
              title="Common problems"
              lead="Most failures come down to a mismatched extension, an unsupported format variant, or a missing desktop engine."
            >
              <div className="space-y-2">
                <Accordion title="The file won't open or says &ldquo;unsupported format&rdquo;">
                  Check that the extension matches the tool. Several formats look
                  alike: <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">.pfb</code> vs{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">.pfa</code>,{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">.pfm</code> is a metrics
                  file that needs its <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">.pfb</code>{" "}
                  companion, and <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">.raw</code>{" "}
                  audio is a completely different thing from a{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">.raw</code> disc image. If a
                  tool asks for a companion file, provide it.
                </Accordion>
                <Accordion title="Conversion fails or produces a blank result">
                  The source may be corrupted, or the variant may not be
                  supported. For example, the browser EXR decoder handles
                  uncompressed, RLE, ZIP and ZIPS — but not PIZ, B44, DWAA,
                  tiled, or multi-part files. Those cases return a clear error
                  with a desktop path rather than failing silently. Open the
                  tool&apos;s{" "}
                  <Link href="/convert" className="text-primary underline underline-offset-4 hover:opacity-80">
                    guide
                  </Link>{" "}
                  for the exact supported subset.
                </Accordion>
                <Accordion title="File is too large for the web tool">
                  The web tool has a per-tool size cap shown on its page. Use the{" "}
                  <Link href="/download" className="text-primary underline underline-offset-4 hover:opacity-80">
                    desktop app
                  </Link>{" "}
                  for unlimited size and batch jobs.
                </Accordion>
                <Accordion title="Desktop tool says “engine required” or sidecar failed">
                  That tool needs a free external engine — FFmpeg, Blender,
                  Calibre, FreeCAD, or FontForge. Install it, restart the desktop
                  app, and retry. If you installed Python but not FontForge, the
                  font tools will still ask for FontForge: its Python module
                  ships with the FontForge installer, not with pip on Windows.{" "}
                  <Link
                    href="/help/engines"
                    className="text-primary underline underline-offset-4 hover:opacity-80"
                  >
                    Illustrated install steps
                  </Link>{" "}
                  for every engine.
                </Accordion>
                <Accordion title="Where is my unlock code?">
                  Each tool displays a free hourly code on its web page. Copy it
                  into the desktop app, pick the same tool, and convert. One code
                  covers one tool for one hour and refreshes on the hour.
                </Accordion>
              </div>
            </Section>

            {/* ---------- FAQ ---------- */}
            <Section id="faq" eyebrow="FAQ" title="Frequently asked questions">
              <div className="grid gap-3 sm:grid-cols-2">
                <FaqCard
                  q="Is it really free?"
                  a="Yes. The web tool is free with no account. The desktop app is free to download, and a few formats open with a free hourly code."
                />
                <FaqCard
                  q="Do I need an account?"
                  a="No. Open a tool and convert. We don't collect email, login, or payment details."
                />
                <FaqCard
                  q="Where do my files go?"
                  a="Nowhere. Everything is processed locally in your browser or desktop app — we never receive the file."
                />
                <FaqCard
                  q="How do I learn a specific format?"
                  a="Every tool has a complete guide at /convert/[slug] covering format background, methods compared, and step-by-step instructions."
                />
                <FaqCard
                  q="Can I convert several files at once?"
                  a="On the web it's one file at a time. The desktop app adds a batch queue."
                />
                <FaqCard
                  q="Why does one tool ask for two files?"
                  a="Some formats split data across files — Type 1 fonts keep outlines in .pfb and metrics in .pfm, and OPF ebooks reference sibling assets."
                />
              </div>
            </Section>

            {/* ---------- CTA ---------- */}
            <div className="mt-12 border-t border-border pt-12">
              <div className="rounded-2xl border border-border bg-muted/40 p-8 text-center">
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  Ready to convert your first file?
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                  Pick a tool, drop a file, and see the result in seconds — no
                  upload, no account, no payment.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/tools"
                    className="mono-label inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Browse tools <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/download"
                    className="mono-label inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-5 py-2.5 text-foreground backdrop-blur-sm transition-colors hover:bg-muted/60"
                  >
                    Download desktop app <Download className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}

/* ================= presentational helpers ================= */

function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t border-border py-12 first:border-t-0 first:pt-0"
    >
      <p className="mono-label text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {lead && (
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
          {lead}
        </p>
      )}
      <div className="mt-8">{children}</div>
    </section>
  );
}

function StepCard({
  n,
  icon: Icon,
  title,
  body,
}: {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4 rounded-xl border border-border bg-background/60 p-4 transition-colors hover:border-primary/40 hover:bg-muted/40">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-muted/60 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="mono-label mb-1">Step {String(n).padStart(2, "0")}</p>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </li>
  );
}

function MiniStep({
  n,
  icon: Icon,
  title,
  body,
}: {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <li className="rounded-xl border border-border bg-background/60 p-4">
      <div className="flex items-center gap-2 text-primary">
        <Icon className="h-4 w-4" />
        <span className="mono-label text-primary">
          {String(n).padStart(2, "0")}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </li>
  );
}

function ToolRow({ tool }: { tool: ToolContent }) {
  const hasGuide = Boolean(getGuide(tool.slug));
  return (
    <div className="group flex items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/40">
      <Link href={`/tools/${tool.slug}`} className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
          {tool.h1}
        </span>
        <span className="mono-label mt-0.5 block text-sm">
          {tool.sourceExt} → {tool.targetExt}
        </span>
      </Link>
      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        {tool.className}
      </span>
      {hasGuide && (
        <Link
          href={`/convert/${tool.slug}`}
          aria-label={`Guide for ${tool.h1}`}
          title="Read the guide"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <BookOpen className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function BrowserFrame({
  src,
  alt,
  caption,
  group,
  eager = false,
}: {
  src: string;
  alt: string;
  caption: string;
  group?: LightboxImage[];
  eager?: boolean;
}) {
  return (
    <figure className="group overflow-hidden rounded-xl border border-border bg-muted/40 shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
        <span className="ml-2 rounded bg-background/70 px-2 py-0.5 font-mono text-sm text-muted-foreground">
          nichefiletools.com
        </span>
      </div>
      <div className="overflow-hidden bg-background">
        <ZoomableImage
          image={{ src, alt, caption }}
          group={group}
          eager={eager}
        />
      </div>
      <figcaption className="border-t border-border bg-muted/40 px-4 py-2.5 text-sm leading-relaxed text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{text}</span>
    </li>
  );
}

function CompareRow({
  feature,
  web,
  desktop,
}: {
  feature: string;
  web: React.ReactNode;
  desktop: React.ReactNode;
}) {
  return (
    <tr>
      <td className="px-4 py-3 font-medium text-foreground">{feature}</td>
      <td className="px-4 py-3">{web}</td>
      <td className="px-4 py-3">{desktop}</td>
    </tr>
  );
}

function Accordion({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-lg border border-border bg-background/50 transition-colors open:border-primary/40 open:bg-muted/30">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-foreground">
        {title}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </details>
  );
}

function FaqCard({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-5 transition-colors hover:border-primary/40 hover:bg-muted/30">
      <p className="text-sm font-semibold text-foreground">{q}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
    </div>
  );
}

/* ================= diagrams ================= */

function ThreeStepDiagram() {
  const steps = [
    { n: "01", label: "Choose tool" },
    { n: "02", label: "Drop file" },
    { n: "03", label: "Download" },
  ];
  return (
    <svg
      viewBox="0 0 720 84"
      className="h-auto w-full max-w-2xl text-muted-foreground"
      role="img"
      aria-label="Three steps: choose a tool, drop a file, download the result"
    >
      <defs>
        <marker
          id="nft-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
        </marker>
      </defs>

      {steps.map((s, i) => {
        const x = i * 246;
        return (
          <g key={s.n}>
            <rect
              x={x}
              y="18"
              width="200"
              height="48"
              rx="10"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.35"
              strokeWidth="1.5"
            />
            <text
              x={x + 18}
              y="48"
              fill="currentColor"
              className="text-primary font-mono"
              fontSize="15"
              fontWeight="700"
            >
              {s.n}
            </text>
            <text x={x + 56} y="48" fontSize="15" fill="currentColor">
              {s.label}
            </text>
            {i < steps.length - 1 && (
              <line
                x1={x + 208}
                y1="42"
                x2={x + 238}
                y2="42"
                stroke="currentColor"
                strokeOpacity="0.5"
                strokeWidth="1.5"
                markerEnd="url(#nft-arrow)"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function PrivacyDiagram() {
  return (
    <svg
      viewBox="0 0 320 200"
      className="h-auto w-full max-w-[260px]"
      role="img"
      aria-label="Files stay on your device; cloud upload is blocked"
    >
      {/* device */}
      <rect
        x="40"
        y="62"
        width="118"
        height="86"
        rx="10"
        fill="none"
        stroke="currentColor"
        className="text-primary"
        strokeWidth="2"
      />
      <rect
        x="62"
        y="86"
        width="74"
        height="6"
        rx="3"
        fill="currentColor"
        className="text-primary"
        opacity="0.45"
      />
      <rect
        x="62"
        y="100"
        width="50"
        height="6"
        rx="3"
        fill="currentColor"
        className="text-primary"
        opacity="0.25"
      />
      <text
        x="99"
        y="134"
        textAnchor="middle"
        fill="currentColor"
        className="text-primary font-mono"
        fontSize="11"
        fontWeight="700"
      >
        YOUR DEVICE
      </text>

      {/* check badge */}
      <g transform="translate(99 34)">
        <circle
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
        />
        <path
          d="M-8 1 l6 6 l11 -13"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        />
      </g>

      {/* blocked cloud */}
      <g className="text-muted-foreground" opacity="0.75">
        <path
          d="M214 96 a20 20 0 0 1 3 -40 a24 24 0 0 1 46 6 a19 19 0 0 1 -2 34 z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1="231"
          y1="68"
          x2="259"
          y2="96"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </g>
      <line
        x1="158"
        y1="104"
        x2="222"
        y2="88"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 5"
        opacity="0.4"
        className="text-muted-foreground"
      />
      <text
        x="237"
        y="126"
        textAnchor="middle"
        fill="currentColor"
        className="text-muted-foreground font-mono"
        fontSize="10"
      >
        NO UPLOAD
      </text>
    </svg>
  );
}

function SizeDiagram() {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-5">
      <p className="mono-label mb-4 text-primary">File size headroom</p>

      <div className="space-y-4">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-foreground">
              Web tool
            </span>
            <span className="mono-label">Per-tool cap</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-2/3 rounded-full bg-primary/70" />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-foreground">
              Desktop app
            </span>
            <span className="mono-label">Unlimited</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-full rounded-full bg-primary" />
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Both run locally. The cap exists because the browser holds the whole file
        in memory; the desktop app streams from disk instead.
      </p>
    </div>
  );
}
