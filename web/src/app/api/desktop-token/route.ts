import { NextResponse } from "next/server";
import { issueToken } from "@/lib/desktopTokenStore";

// 密钥回流 doc §4.1/§4.2：Token 服务端生成；设备终身一次；IP 限流。
// 桌面端在 body 中携带 device_id（随机 UUID，非隐私数据）。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const deviceId = String(body?.device_id ?? "");
  if (!deviceId) {
    return NextResponse.json(
      { error: "device_id required" },
      { status: 400 },
    );
  }
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const r = issueToken(deviceId, ip);
  if (!r.ok) {
    const status = r.error === "rate_limited" ? 429 : 403;
    return NextResponse.json({ error: r.error }, { status });
  }
  return NextResponse.json({
    token: r.token,
    expires_at: new Date(r.expiresAt).toISOString(),
  });
}
