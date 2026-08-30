import type { Metadata } from "next";
import { ShieldCheck, Cpu, HeartHandshake, Lock } from "lucide-react";
import {
  HELLO_EMAIL,
  REPO_ISSUES_URL,
  REPO_NAME,
  REPO_OWNER,
  REPO_URL,
  SUPPORT_EMAIL,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "About nichefiletools — Our Mission & Values",
  description:
    "nichefiletools makes file conversion private, accessible, and free. Learn how our browser-based converters work and what we believe in.",
  alternates: { canonical: "/about" },
  robots: { index: true, follow: true },
};

const values = [
  {
    icon: Lock,
    title: "Privacy first",
    body: "No uploads, ever. Online tools run in your browser; the desktop app runs offline.",
  },
  {
    icon: Cpu,
    title: "Real engineering",
    body: "Converters are built on WebAssembly and native Rust kernels — not wrappers around someone else's API.",
  },
  {
    icon: ShieldCheck,
    title: "Honest limits",
    body: "Every tool page states its exact file-size limit. If a format needs the desktop app, we say so.",
  },
  {
    icon: HeartHandshake,
    title: "Free, period",
    body: "Everything is free: web tools are unlimited, desktop tools unlock with a free hourly code. No payments, no accounts, no upsells.",
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <header>
        <p className="mono-label">About us</p>
        <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-tighter text-foreground sm:text-5xl">
          File conversion,{" "}
          <span className="bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
            private
          </span>{" "}
          by default
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          nichefiletools exists for one reason: converting a file
          shouldn&rsquo;t mean uploading your data to a stranger&rsquo;s
          server.
        </p>
      </header>

      <section className="seo-prose mt-10">
        <h2>Our story</h2>
        <p>
          We kept running into the same wall: niche formats — Kindle ebooks,
          CAD parts, GPU textures, raw disc images — either had no converter
          at all, or the available tools demanded that you upload the file to
          a cloud service. For a contract document, a client&rsquo;s CAD
          model, or a family photo archive, that is a non-starter.
        </p>
        <p>
          So we built the alternative. nichefiletools runs each conversion{" "}
          <strong>entirely on your machine</strong>: in the browser via
          WebAssembly for everyday files, and as a native desktop application
          for the heavy formats browsers genuinely cannot handle. Your files
          never leave your device, because we never receive them.
        </p>

        <h2>What we believe in</h2>
      </section>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {values.map((v) => {
          const Icon = v.icon;
          return (
            <div key={v.title} className="glass-panel p-5">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold tracking-tight text-foreground">
                {v.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {v.body}
              </p>
            </div>
          );
        })}
      </div>

      <section className="seo-prose mt-10">
        <h2>How the technology works</h2>
        <p>
          Online tools are compiled to WebAssembly and execute inside a
          sandboxed browser tab — there is no server-side processing step at
          all. The desktop app is built with Rust and performs the same
          parsing natively, which removes browser memory limits and enables
          batch processing and multi-gigabyte disc images.
        </p>

        <h2>Open source</h2>
        <p>
          The entire project — the Next.js web app, the Tauri 2 desktop shell,
          and every Rust conversion kernel — is public at{" "}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            github.com/{REPO_OWNER}/{REPO_NAME}
          </a>
          . &ldquo;Runs on your device&rdquo; is a claim you should be able to
          verify, not take on faith, so the code that makes that promise is
          readable by anyone.
        </p>
        <p>
          That includes the desktop unlock system. Each desktop tool is gated
          by a code that sits on that tool&rsquo;s page and rotates every hour.
          The code is derived from a deliberately public, deterministic
          algorithm — because in an open-source project there is no server
          secret to keep. It is a way to point people back at the page that
          explains a format, not a security boundary. The full reasoning and
          the 30-second version of the algorithm are written up on the{" "}
          <a href="/free-trial">how the unlock code works</a> page.
        </p>
        <p>
          Found a bug or want a format supported?{" "}
          <a href={REPO_ISSUES_URL} target="_blank" rel="noopener noreferrer">
            Open an issue
          </a>{" "}
          — a small sample file attached to an issue is the single most useful
          thing you can send.
        </p>

        <h2>Get in touch</h2>
        <p>
          Feature requests, format requests, or partnership inquiries:{" "}
          <a href={`mailto:${HELLO_EMAIL}`}>{HELLO_EMAIL}</a>. Problems with a
          conversion: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{" "}
          or the <a href="/support">support center</a>.
        </p>
      </section>
    </main>
  );
}
