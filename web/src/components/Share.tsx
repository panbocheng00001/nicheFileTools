"use client";

import { useState } from "react";
import { Share2, Link2, Check, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Relative path, such as /tools/kfx-to-epub*/
  path: string;
  title: string;
  className?: string;
}

export function Share({ path, title, className }: Props) {
  const [copied, setCopied] = useState(false);

  //Use origin to spell the absolute URL (SSR security: window is only accessed in effect/event)
  const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  const encUrl = encodeURIComponent(url);
  const encTitle = encodeURIComponent(title);

  const shares = [
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${encUrl}&text=${encTitle}`,
      icon: <XIcon className="h-4 w-4" />,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`,
      icon: <FbIcon className="h-4 w-4" />,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`,
      icon: <InIcon className="h-4 w-4" />,
    },
    {
      label: "Reddit",
      href: `https://www.reddit.com/submit?url=${encUrl}&title=${encTitle}`,
      icon: <RedditIcon className="h-4 w-4" />,
    },
    {
      label: "Email",
      href: `mailto:?subject=${encTitle}&body=${encUrl}`,
      icon: <Mail className="h-4 w-4" />,
      mail: true,
    },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      //Downgrade: check prompt
      window.prompt("Copy link:", url);
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="mono-label mr-1 inline-flex items-center gap-1.5">
        <Share2 className="h-3.5 w-3.5" /> Share
      </span>
      {shares.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target={s.mail ? undefined : "_blank"}
          rel={s.mail ? undefined : "noopener noreferrer"}
          aria-label={`Share on ${s.label}`}
          title={s.label}
          className="grid h-8 w-8 place-items-center rounded-lg border border-border/60 bg-background/40 text-muted-foreground transition-all hover:border-primary/50 hover:text-primary"
        >
          {s.icon}
        </a>
      ))}
      <button
        type="button"
        onClick={copy}
        aria-label="Copy link"
        title="Copy link"
        className={cn(
          "grid h-8 w-8 place-items-center rounded-lg border transition-all",
          copied
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/50 hover:text-primary",
        )}
      >
        {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

/*—— Inline brand icon (lucide unbranded icon) ——*/
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function FbIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
function InIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
function RedditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.25s-.562 1.25-1.25 1.25-1.25-.561-1.25-1.25.562-1.25 1.25-1.25zm-4.27 1.25a2.75 2.75 0 012.75 2.75c0 .05-.001.1-.004.15 1.2.5 2.27 1.27 3.13 2.27.42-.32.94-.5 1.5-.5 1.38 0 2.5 1.12 2.5 2.5 0 1.04-.63 1.93-1.53 2.31-.04 3.07-3.36 5.55-7.49 5.55s-7.45-2.48-7.49-5.55c-.9-.38-1.53-1.27-1.53-2.31 0-1.38 1.12-2.5 2.5-2.5.56 0 1.08.18 1.5.5.86-1 1.93-1.77 3.13-2.27a2.75 2.75 0 01-.004-.15 2.75 2.75 0 012.75-2.75zm-3.5 4.5a1 1 0 100 2 1 1 0 000-2zm7 0a1 1 0 100 2 1 1 0 000-2zm-3.5 4c-1.5 0-2.7.4-3.55 1.05-.55.42-.85.9-.85 1.45 0 .3.1.5.3.65.2.15.5.25.85.25h6.5c.35 0 .65-.1.85-.25.2-.15.3-.35.3-.65 0-.55-.3-1.03-.85-1.45C14.7 14.4 13.5 14 12 14z" />
    </svg>
  );
}
