import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Box,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clapperboard,
  Cog,
  Download,
  ExternalLink,
  FileCode2,
  FlaskConical,
  Monitor,
  Music,
  RefreshCw,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { ZoomableImage, type LightboxImage } from "@/components/Lightbox";

export const metadata: Metadata = {
  title: "How to Install the Third-Party Conversion Engines",
  description:
    "Step-by-step guide with screenshots for installing the five free third-party engines the nichefiletools desktop app uses: FFmpeg, Blender, Calibre, FreeCAD and Python — including PATH setup, environment-variable overrides and troubleshooting.",
  alternates: { canonical: "/help/engines" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "How to Install the Third-Party Conversion Engines",
    description:
      "Install FFmpeg, Blender, Calibre, FreeCAD and Python for the nichefiletools desktop app — with per-platform commands, verification steps and fixes.",
  },
};

/* HowTo schema for the generic "install an engine" flow (SEO) + FAQPage
   matching the visible troubleshooting accordions (spec §3.3) */
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Install a third-party conversion engine for the nichefiletools desktop app",
    description:
      "Seven desktop tools rely on five free open-source engines. This guide shows how to install each engine on Windows and macOS and verify it is detected.",
    totalTime: "PT10M",
    step: [
      {
        "@type": "HowToStep",
        name: "Open the tool in the desktop app",
        text: "If a tool needs an engine you don't have, the app shows a banner listing the missing engine with an Install link.",
      },
      {
        "@type": "HowToStep",
        name: "Install the engine",
        text: "Use winget (Windows), brew (macOS) or the engine's official website. All five engines are free and open source.",
      },
      {
        "@type": "HowToStep",
        name: "Verify and re-check",
        text: "Run the engine's version command in a terminal, then press Re-check after installing in the desktop app.",
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "I installed the engine but the app still says it's missing",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Three usual suspects: the installer was still running when you opened the app — quit and reopen so it inherits the updated PATH; the engine isn't on PATH at all (common with macOS app bundles) — set the environment variable from the table above; or you installed a different build — verify with the --version command, then press Re-check after installing.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need all five engines?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Install only what your formats need: FFmpeg for GSM/MTS audio-video, Blender for BLEND models, Calibre for KFX e-books, FreeCAD for STEP/IGES CAD parts, Python for SAV data sets and Type 1 fonts. The other eight desktop tools need nothing at all.",
        },
      },
      {
        "@type": "Question",
        name: "Are these engines safe? Are they really free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes to both. All five are long-established open-source projects (LGPL/GPL/PSF/MIT licences) used daily by millions. The desktop app runs each one offline, with your file paths as its only arguments — no shell, no network.",
        },
      },
      {
        "@type": "Question",
        name: "Why aren't the engines bundled with the app?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Two reasons. Licences: GPL code can't ship inside a differently-licensed binary without infecting it, so the app calls each engine as a separate process instead. Size: the five engines together would add well over a gigabyte to the installer — most users need at most one or two.",
        },
      },
      {
        "@type": "Question",
        name: "SAV conversion fails with a pandas error",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The SAV tool needs the pandas module in whatever Python the app found. Run pip install pandas (or pip3 install pandas on macOS) in a terminal, then retry — no app restart needed for module installs.",
        },
      },
      {
        "@type": "Question",
        name: "PFB/PFA conversion fails even though Python is installed",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Type 1 font conversion imports the fontforge module, which is not on PyPI. Install the FontForge application from fontforgebuilds.com and point PYTHON_BIN at its bundled interpreter — the exact paths for Windows and macOS are in the Python section.",
        },
      },
    ],
  },
];

const TOC = [
  { id: "overview", label: "Which tools need engines" },
  { id: "in-app", label: "Inside the app" },
  { id: "ffmpeg", label: "FFmpeg" },
  { id: "blender", label: "Blender" },
  { id: "calibre", label: "Calibre" },
  { id: "freecad", label: "FreeCAD" },
  { id: "python", label: "Python" },
  { id: "verify", label: "Verify & overrides" },
  { id: "faq", label: "Troubleshooting" },
];

/* ================= engine data (mirrors src-tauri/src/convert/engine.rs) ================= */

interface EngineSpec {
  id: string;
  name: string;
  license: string;
  icon: LucideIcon;
  purpose: string;
  tools: { slug: string; label: string }[];
  site: { url: string; label: string };
  windows: string[];
  macos: string[];
  verify: string[];
  note: React.ReactNode;
}

const ENGINES: EngineSpec[] = [
  {
    id: "ffmpeg",
    name: "FFmpeg",
    license: "LGPL",
    icon: Clapperboard,
    purpose: "Audio and video transcoding — the industry-standard Swiss army knife.",
    tools: [
      { slug: "gsm-to-wav", label: "GSM → WAV (phone recordings)" },
      { slug: "mts-to-mp4", label: "MTS / M2TS → MP4 (camcorder clips)" },
    ],
    site: { url: "https://ffmpeg.org/download.html", label: "ffmpeg.org/download.html" },
    windows: [
      "winget install Gyan.FFmpeg",
      "# — or download a build from ffmpeg.org and add its \\bin folder to PATH",
    ],
    macos: ["brew install ffmpeg"],
    verify: ["ffmpeg -version"],
    note: (
      <>
        The Windows winget package puts <code>ffmpeg.exe</code> on your PATH
        automatically. If you download a zip build instead, add its{" "}
        <code>bin</code> folder to the <em>PATH</em> environment variable — the
        app looks for <code>ffmpeg.exe</code> on the PATH (or point{" "}
        <code>FFMPEG_BIN</code> at it, see{" "}
        <a href="#verify" className="text-primary underline underline-offset-4">
          overrides
        </a>
        ).
      </>
    ),
  },
  {
    id: "blender",
    name: "Blender",
    license: "GPL-3.0",
    icon: Box,
    purpose: "Exports Blender scenes to glTF through its built-in bpy exporter.",
    tools: [{ slug: "blend-to-glb", label: "BLEND → GLB (3D scenes)" }],
    site: { url: "https://www.blender.org/download/", label: "blender.org/download" },
    windows: ["winget install BlenderFoundation.Blender"],
    macos: [
      "brew install --cask blender",
      "# the app needs the CLI binary — set BLENDER_CMD if not on PATH:",
      "export BLENDER_CMD=/Applications/Blender.app/Contents/MacOS/Blender",
    ],
    verify: ["blender --version"],
    note: (
      <>
        Any release from 2.80 onward works. macOS installs the app bundle
        without a CLI symlink by default, so the{" "}
        <code>BLENDER_CMD</code> line above (added to your{" "}
        <code>~/.zshrc</code>) is usually all you need.
      </>
    ),
  },
  {
    id: "calibre",
    name: "Calibre",
    license: "GPL-3.0",
    icon: BookOpen,
    purpose: "E-book conversion via its ebook-convert command — the only reliable KFX decoder.",
    tools: [{ slug: "kfx-to-epub", label: "KFX → EPUB (Kindle e-books)" }],
    site: { url: "https://calibre-ebook.com/download", label: "calibre-ebook.com/download" },
    windows: ["winget install calibre.calibre"],
    macos: [
      "brew install --cask calibre",
      "# CLI lives inside the app bundle — point CALIBRE_BIN at it:",
      "export CALIBRE_BIN=/Applications/calibre.app/Contents/MacOS/ebook-convert",
    ],
    verify: ["ebook-convert --version"],
    note: (
      <>
        The app calls <code>ebook-convert</code> (not the Calibre GUI). The
        Windows installer adds it to PATH automatically; on macOS use the{" "}
        <code>CALIBRE_BIN</code> line above.
      </>
    ),
  },
  {
    id: "freecad",
    name: "FreeCAD",
    license: "LGPL",
    icon: Cog,
    purpose: "CAD tessellation through FreeCAD's OpenCASCADE kernel — turns exact surfaces into printable meshes.",
    tools: [{ slug: "prt-to-stl", label: "STEP / IGES / BREP → STL (CAD parts)" }],
    site: { url: "https://www.freecad.org/download/", label: "freecad.org/download" },
    windows: [
      "winget install FreeCAD.FreeCAD",
      "# if freecadcmd.exe is not on PATH, point FREECAD_CMD at it:",
      '# setx FREECAD_CMD "C:\\Program Files\\FreeCAD 1.0\\bin\\freecadcmd.exe"',
    ],
    macos: [
      "brew install --cask freecad",
      "export FREECAD_CMD=/Applications/FreeCAD.app/Contents/MacOS/freecadcmd",
    ],
    verify: ["freecadcmd --help"],
    note: (
      <>
        The app drives <code>freecadcmd</code>, FreeCAD's console binary, with a
        small Python script that tessellates the shape at 0.1&nbsp;mm chordal
        tolerance. The regular FreeCAD GUI install includes it — you never need
        to open FreeCAD yourself.
      </>
    ),
  },
  {
    id: "python",
    name: "Python",
    license: "PSF / MIT",
    icon: FileCode2,
    purpose: "Runs conversion scripts that need the pandas and fontforge modules.",
    tools: [
      { slug: "sav-to-csv", label: "SAV → CSV (SPSS data sets)" },
      { slug: "pfm-to-ttf", label: "PFB / PFA → TTF (Type 1 fonts)" },
    ],
    site: { url: "https://www.python.org/downloads/", label: "python.org/downloads" },
    windows: [
      "winget install Python.Python.3.12",
      "pip install pandas",
      "# PFB/PFA fonts additionally need FontForge's bundled Python:",
      "# install from fontforgebuilds.com, then",
      '# setx PYTHON_BIN "C:\\Program Files (x86)\\FontForgeBuilds\\bin\\ffpython.exe"',
    ],
    macos: [
      "brew install python",
      "pip3 install pandas",
      "# PFB/PFA fonts: install the FontForge app, then",
      "export PYTHON_BIN=/Applications/FontForge.app/Contents/MacOS/FFPython",
    ],
    verify: ["python --version", "python -c \"import pandas; print(pandas.__version__)\""],
    note: (
      <>
        SAV files only need plain Python 3 plus{" "}
        <code>pandas</code>. Type&nbsp;1 fonts are converted with FontForge's
        own Python build (the <code>fontforge</code> module is not on PyPI), so
        for PFB/PFA work install{" "}
        <a
          href="https://fontforgebuilds.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-4"
        >
          FontForge
        </a>{" "}
        and point <code>PYTHON_BIN</code> at its interpreter as shown above.
      </>
    ),
  },
];

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

function CodeBlock({ lines, label }: { lines: string[]; label: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-zinc-950">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="mono-label text-zinc-400">{label}</span>
        <span className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-zinc-700" />
          <span className="h-2 w-2 rounded-full bg-zinc-700" />
        </span>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-sm leading-relaxed text-zinc-200">
        {lines.map((l, i) => (
          <div key={i} className={l.startsWith("#") ? "text-zinc-500" : ""}>
            {l.startsWith("#") ? l : <><span className="text-primary">$ </span>{l}</>}
          </div>
        ))}
      </pre>
    </div>
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

function EngineSection({ e }: { e: EngineSpec }) {
  const Icon = e.icon;
  return (
    <Section
      id={e.id}
      eyebrow={`${e.name} · ${e.license}`}
      title={`Installing ${e.name}`}
      lead={e.purpose}
    >
      {/* tools served by this engine */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mono-label">Used by</span>
        {e.tools.map((t) => (
          <Link
            key={t.slug}
            href={`/tools/${t.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Icon className="h-3.5 w-3.5 text-primary" />
            {t.label}
            <ArrowRight className="h-3 w-3 opacity-50" />
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <CodeBlock label="Windows · PowerShell" lines={e.windows} />
          <CodeBlock label="macOS · Terminal" lines={e.macos} />
        </div>
        <div className="space-y-4">
          <CodeBlock label="Verify" lines={e.verify} />
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
            <p className="mono-label mb-2 flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-primary" /> Good to know
            </p>
            {e.note}
          </div>
          <a
            href={e.site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mono-label inline-flex items-center gap-1.5 text-primary transition-opacity hover:opacity-80"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Official download: {e.site.label}
          </a>
        </div>
      </div>
    </Section>
  );
}

/* ================= page ================= */

export default function EngineGuidePage() {
  return (
    <main className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 ambient-grid opacity-40" />

      {/* ================= HERO ================= */}
      <header className="border-b border-border/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-2 font-mono text-sm uppercase tracking-widest text-muted-foreground">
              <li>
                <Link href="/help" className="transition-colors hover:text-primary">
                  Help
                </Link>
              </li>
              <li aria-hidden="true">→</li>
              <li aria-current="page" className="text-foreground">
                Engine install guide
              </li>
            </ol>
          </nav>

          <p className="mono-label inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-primary">
            <CircleHelp className="h-3.5 w-3.5" /> Desktop · Third-party engines
          </p>

          <h1 className="mt-5 max-w-3xl text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
            Installing the third-party engines —{" "}
            <span className="text-primary">five tools, ten minutes.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Seven of the desktop app&apos;s fifteen tools borrow power from free,
            open-source engines: FFmpeg, Blender, Calibre, FreeCAD and Python.
            They are not bundled (open-source licences keep the app tiny and
            clean), but each installs in one command. This guide shows exactly
            how — per platform, with verification steps.
          </p>

          {/*Self-contained AI-citable answer (spec §2.11/§9.5: 40-60 words,
              quotable out of context for AI Overview / Copilot / ChatGPT)*/}
          <p className="mt-5 max-w-2xl border-l-2 border-primary/60 pl-4 text-base leading-relaxed text-foreground">
            <strong>Quick answer:</strong> The nichefiletools desktop app uses
            five free, open-source engines — FFmpeg, Blender, Calibre, FreeCAD,
            and Python — to power seven of its fifteen tools. Install each with
            one command (winget on Windows, brew on macOS), verify with the
            engine&apos;s --version command, then press Re-check in the app.
            None are bundled; all are free.
          </p>

          <figure className="mt-10 overflow-hidden rounded-2xl border border-border shadow-sm">
            <ZoomableImage
              image={{
                src: "/help/engines/install-desktop-conversion-engines.png",
                alt: "Illustration of five engine modules — video, 3D, e-book, CAD and font — plugging into the nichefiletools desktop converter",
                caption:
                  "Five free engines plug into the desktop app. Each is optional: install only the ones behind the tools you actually use.",
              }}
              eager
            />
          </figure>
        </div>
      </header>

      {/* ================= BODY ================= */}
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
          {/* TOC */}
          <aside className="mb-10 lg:mb-0">
            <nav aria-label="On this page">
              <p className="mono-label mb-3">On this page</p>
              <ul className="space-y-1 border-l border-border">
                {TOC.map((t) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className="-ml-px block border-l-2 border-transparent py-1 pl-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      {t.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div>
            {/* -------- overview -------- */}
            <Section
              id="overview"
              eyebrow="Overview"
              title="Which tools need which engine"
              lead={
                <>
                  Eight tools are pure Rust and work out of the box. The other
                  seven delegate to an engine — the app tells you which one the
                  moment you open the tool, but here is the full matrix up front.
                </>
              }
            >
              <div className="overflow-x-auto rounded-xl border border-border bg-background/50">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 font-mono text-sm uppercase tracking-widest text-muted-foreground">
                      <th className="px-4 py-3">Engine</th>
                      <th className="px-4 py-3">Tool</th>
                      <th className="px-4 py-3 text-primary">Licence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ENGINES.flatMap((e) =>
                      e.tools.map((t, i) => (
                        <tr
                          key={t.slug}
                          className="border-b border-border/40 last:border-b-0"
                        >
                          <td className="px-4 py-3 font-medium text-foreground">
                            {i === 0 ? e.name : ""}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/tools/${t.slug}`}
                              className="text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                            >
                              {t.label}
                            </Link>
                          </td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">
                            {i === 0 ? e.license : ""}
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <p className="mono-label mb-1 flex items-center gap-1.5 text-primary">
                    <FlaskConical className="h-3.5 w-3.5" /> Why separate?
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    GPL/LGPL code can&apos;t be mixed into a single binary. Each
                    engine runs as its own process, keeping the app&apos;s MIT
                    licence honest.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <p className="mono-label mb-1 flex items-center gap-1.5 text-primary">
                    <Monitor className="h-3.5 w-3.5" /> 100% local
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Engines run on your machine, offline. No file, argument or
                    telemetry ever leaves the device.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <p className="mono-label mb-1 flex items-center gap-1.5 text-primary">
                    <Check className="h-3.5 w-3.5" /> All free
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Every engine is free and open source. Install only the ones
                    for formats you actually convert.
                  </p>
                </div>
              </div>
            </Section>

            {/* -------- in-app -------- */}
            <Section
              id="in-app"
              eyebrow="In the app"
              title="You don't need to guess — the app tells you"
              lead={
                <>
                  Open any engine-powered tool in the desktop app and it checks
                  your system instantly. Missing an engine? A banner appears
                  with the engine name, an <em>Install</em> button that opens
                  the official download page, and a{" "}
                  <em>Re-check after installing</em> button. The Convert button
                  stays disabled until everything is in place — so you can
                  never hit a half-converted file.
                </>
              }
            >
              <figure className="overflow-hidden rounded-xl border border-border bg-muted/40 shadow-sm">
                <div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                  <span className="ml-2 rounded bg-background/70 px-2 py-0.5 font-mono text-sm text-muted-foreground">
                    nichefiletools · desktop
                  </span>
                </div>
                <ZoomableImage
                  image={{
                    src: "/help/exr-to-png-converter-interface.png",
                    alt: "The nichefiletools desktop converter: drop zone on the left, unlock-code panel and status messages on the right",
                    caption:
                      "The converter screen with an engine banner visible in place of the drop zone.",
                  }}
                />
                <figcaption className="border-t border-border bg-muted/40 px-4 py-2.5 text-sm leading-relaxed text-muted-foreground">
                  The converter screen. When an engine is missing, its banner
                  replaces the drop zone until you install it — then hit{" "}
                  <RefreshCw className="inline h-3.5 w-3.5 text-primary" />{" "}
                  Re-check and you&apos;re converting.
                </figcaption>
              </figure>
            </Section>

            {/* -------- per-engine guides -------- */}
            {ENGINES.map((e) => (
              <EngineSection key={e.id} e={e} />
            ))}

            {/* -------- verify & overrides -------- */}
            <Section
              id="verify"
              eyebrow="Advanced"
              title="How detection works — and how to override it"
              lead={
                <>
                  At startup the app scans your <code>PATH</code> for each
                  engine&apos;s executable. If an engine lives somewhere unusual
                  (a portable build, an app bundle), point the app at it with an
                  environment variable instead — the variable always wins.
                </>
              }
            >
              <div className="overflow-x-auto rounded-xl border border-border bg-background/50">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 font-mono text-sm uppercase tracking-widest text-muted-foreground">
                      <th className="px-4 py-3">Engine</th>
                      <th className="px-4 py-3">Environment variable (in order)</th>
                      <th className="px-4 py-3 text-primary">Looks for on PATH</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/40">
                      <td className="px-4 py-3 font-medium text-foreground">FFmpeg</td>
                      <td className="px-4 py-3 font-mono text-sm">FFMPEG_BIN, NICHE_FFMPEG</td>
                      <td className="px-4 py-3 font-mono text-sm">ffmpeg(.exe)</td>
                    </tr>
                    <tr className="border-b border-border/40">
                      <td className="px-4 py-3 font-medium text-foreground">Blender</td>
                      <td className="px-4 py-3 font-mono text-sm">BLENDER_CMD, NICHE_BLENDER</td>
                      <td className="px-4 py-3 font-mono text-sm">blender</td>
                    </tr>
                    <tr className="border-b border-border/40">
                      <td className="px-4 py-3 font-medium text-foreground">Calibre</td>
                      <td className="px-4 py-3 font-mono text-sm">CALIBRE_BIN, NICHE_CALIBRE</td>
                      <td className="px-4 py-3 font-mono text-sm">ebook-convert, calibre</td>
                    </tr>
                    <tr className="border-b border-border/40">
                      <td className="px-4 py-3 font-medium text-foreground">FreeCAD</td>
                      <td className="px-4 py-3 font-mono text-sm">FREECAD_CMD, OCCT_BIN, NICHE_OCCT</td>
                      <td className="px-4 py-3 font-mono text-sm">freecadcmd, DRAWEXE, occt</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-foreground">Python</td>
                      <td className="px-4 py-3 font-mono text-sm">PYTHON_BIN, NICHE_PYTHON</td>
                      <td className="px-4 py-3 font-mono text-sm">python, py</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                The variable must contain the full path to the{" "}
                <strong>executable file</strong> (not a folder). After changing
                an environment variable, restart the desktop app so it picks up
                the new value.
              </p>
            </Section>

            {/* -------- FAQ -------- */}
            <Section
              id="faq"
              eyebrow="Troubleshooting"
              title="Common problems, answered"
              lead="Most engine issues come down to PATH, a stale terminal, or an app-bundle install. These cover the rest."
            >
              <div className="space-y-3">
                <Accordion title="I installed the engine but the app still says it's missing">
                  Three usual suspects: (1) the installer was still running when
                  you opened the app — quit and reopen the app so it inherits
                  the updated PATH; (2) the engine isn&apos;t on PATH at all
                  (common with macOS app bundles) — set the environment variable
                  from the table above; (3) you installed a different build —
                  verify with the <code>--version</code> command shown in each
                  section, then press <em>Re-check after installing</em>.
                </Accordion>
                <Accordion title="Do I need all five engines?">
                  No. Install only what your formats need: FFmpeg for GSM/MTS
                  audio-video, Blender for BLEND models, Calibre for KFX
                  e-books, FreeCAD for STEP/IGES CAD parts, Python for SAV data
                  sets and Type&nbsp;1 fonts. The other eight desktop tools need
                  nothing at all.
                </Accordion>
                <Accordion title="Are these engines safe? Are they really free?">
                  Yes to both. All five are long-established open-source
                  projects (LGPL/GPL/PSF/MIT licences) used daily by millions.
                  The desktop app runs each one offline, with your file paths as
                  its only arguments — no shell, no network.
                </Accordion>
                <Accordion title="Why aren't the engines bundled with the app?">
                  Two reasons. Licences: GPL code can&apos;t ship inside a
                  differently-licensed binary without infecting it, so the app
                  calls each engine as a separate process instead. Size: the
                  five engines together would add well over a gigabyte to the
                  installer — most users need at most one or two.
                </Accordion>
                <Accordion title="SAV conversion fails with a pandas error">
                  The SAV tool needs the <code>pandas</code> module in whatever
                  Python the app found. Run{" "}
                  <code>pip install pandas</code> (or{" "}
                  <code>pip3 install pandas</code> on macOS) in a terminal, then
                  retry — no app restart needed for module installs.
                </Accordion>
                <Accordion title="PFB/PFA conversion fails even though Python is installed">
                  Type&nbsp;1 font conversion imports the{" "}
                  <code>fontforge</code> module, which is not on PyPI. Install
                  the FontForge application from fontforgebuilds.com and point{" "}
                  <code>PYTHON_BIN</code> at its bundled interpreter — the exact
                  paths for Windows and macOS are in the{" "}
                  <a href="#python" className="text-primary underline underline-offset-4">
                    Python section
                  </a>
                  .
                </Accordion>
              </div>
            </Section>

            {/* -------- next steps -------- */}
            <div className="glass mt-12 p-6 sm:p-8">
              <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    Engines installed? You&apos;re ready.
                  </h2>
                  <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
                    Grab the free desktop app if you haven&apos;t, and pick a
                    tool — every engine-powered converter works offline with no
                    account.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-3">
                  <Link
                    href="/download"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[0_0_18px_rgba(74,222,128,0.3)]"
                  >
                    <Download className="h-4 w-4" />
                    Get the app
                  </Link>
                  <Link
                    href="/help"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-5 py-2.5 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <CircleHelp className="h-4 w-4" />
                    Help center
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
