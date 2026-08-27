import { NextResponse } from "next/server";
import { validateToken } from "@/lib/desktopTokenStore";

// DEV STUB — validates a token and returns the associated key for display.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const { valid, key } = validateToken(token);
  return NextResponse.json({
    valid,
    key: valid ? key : undefined,
  });
}
