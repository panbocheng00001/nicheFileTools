import { describe, it, expect } from "vitest";
import {
  CODE_HOUR_MS,
  IS_DEV_SITE,
  SITE,
  formatRemaining,
  normalizeSiteUrl,
  siteOrigin,
  toolPageUrl,
} from "./site";

/// Set only when someone has a `.env.local` with an explicit host; the tests
/// below have to tolerate that instead of hard-coding the default.
const override = import.meta.env.VITE_SITE_URL as string | undefined;

describe("site host", () => {
  /// `npm run dev` / `npm run tauri dev` must hit the local Next.js dev server;
  /// only `vite build` (what `tauri build` runs) may hit the production domain.
  /// A release build pointing at localhost would be a shipped bug, and a dev
  /// build pointing at production would be untestable.
  it("points at localhost during local development when no override is set", () => {
    if (override) {
      // An explicit VITE_SITE_URL always wins.
      expect(SITE).toBe(normalizeSiteUrl(override));
      return;
    }
    expect(import.meta.env.DEV).toBe(true);
    expect(SITE).toBe("http://localhost:3000");
    expect(IS_DEV_SITE).toBe(true);
  });

  it("never carries a trailing slash", () => {
    expect(SITE.endsWith("/")).toBe(false);
    expect(toolPageUrl("kfx-to-epub")).not.toContain("//tools");
  });

  it("flags non-production hosts so the UI can say so", () => {
    expect(IS_DEV_SITE).toBe(!SITE.startsWith("https://nichefiletools.com"));
  });
});

describe("normalizeSiteUrl", () => {
  it("trims whitespace and trailing slashes", () => {
    expect(normalizeSiteUrl("  https://example.com/  ")).toBe("https://example.com");
    expect(normalizeSiteUrl("https://example.com///")).toBe("https://example.com");
    expect(normalizeSiteUrl("http://localhost:3000/")).toBe("http://localhost:3000");
  });

  /// A hand-edited `.env` with a trailing slash used to yield `//tools/...`,
  /// which resolves to a host with an empty label and silently 404s.
  it("keeps an override usable no matter how it was typed", () => {
    expect(`${normalizeSiteUrl(" https://staging.example.com/ ")}/tools/x`).toBe(
      "https://staging.example.com/tools/x",
    );
  });
});

describe("toolPageUrl", () => {
  it("builds the page that shows the code for a tool", () => {
    expect(toolPageUrl("kfx-to-epub")).toBe(`${SITE}/tools/kfx-to-epub`);
  });

  /// The desktop catalogue and the web catalogue differ for exactly one tool;
  /// the link must follow the override or it 404s.
  it("follows the web_slug override for step-to-stl", () => {
    expect(toolPageUrl("prt-to-stl")).toBe(`${SITE}/tools/prt-to-stl`);
  });
});

describe("siteOrigin", () => {
  it("strips the scheme for compact UI hints", () => {
    expect(siteOrigin()).toBe(SITE.replace(/^https?:\/\//, ""));
    expect(siteOrigin()).not.toContain("http");
  });
});

describe("formatRemaining", () => {
  it("renders mm:ss under an hour", () => {
    expect(formatRemaining(0)).toBe("00:00");
    expect(formatRemaining(1_000)).toBe("00:01");
    expect(formatRemaining(59_000)).toBe("00:59");
    expect(formatRemaining(60_000)).toBe("01:00");
    expect(formatRemaining(3_599_000)).toBe("59:59");
  });

  it("switches to h:mm:ss at an hour or more", () => {
    expect(formatRemaining(3_600_000)).toBe("1:00:00");
    expect(formatRemaining(3_725_000)).toBe("1:02:05");
    expect(formatRemaining(CODE_HOUR_MS)).toBe("1:00:00");
  });

  /// A lapsed unlock must not render a negative countdown.
  it("clamps negatives to zero", () => {
    expect(formatRemaining(-5_000)).toBe("00:00");
  });
});

describe("CODE_HOUR_MS", () => {
  /// Kept in sync by hand with `web/src/lib/desktopCode.ts` and
  /// `desktop/src-tauri/src/desktop_code.rs`; a drift here would show the wrong
  /// countdown without any compile error.
  it("is exactly one hour", () => {
    expect(CODE_HOUR_MS).toBe(3_600_000);
  });
});
