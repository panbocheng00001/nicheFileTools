import { NextResponse } from "next/server";
import { redeemToken } from "@/lib/desktopTokenStore";

// 密钥回流 doc §4.3：核销校验 token+key+device 绑定，成功即锁定设备终身资格。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ok = redeemToken(
    body?.token || "",
    body?.key || "",
    body?.device_id ? String(body.device_id) : undefined,
  );
  if (!ok) {
    return NextResponse.json(
      { error: "invalid or already redeemed key" },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
