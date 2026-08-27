import type { Metadata } from "next";
import { Suspense } from "react";
import FreeTrialClient from "./FreeTrialClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Free Desktop Unlock Key — 2 Free Conversions",
  description:
    "Verify your free nichefiletools desktop unlock key and unlock 2 free conversions. No credit card required.",
  alternates: {
    // 密钥回流 doc §6.1: token/utm params must canonicalize to /free-trial.
    canonical: "https://nichefiletools.com/free-trial",
  },
  robots: { index: true, follow: true },
};

export default function FreeTrialPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-muted-foreground">Loading…</div>
      }
    >
      <FreeTrialClient />
    </Suspense>
  );
}
