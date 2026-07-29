import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  isModerationConfigured,
  moderationCookieName,
  moderationCookieOptions,
  signModerationSession,
  verifyModerationPassword,
  verifyModerationToken,
} from "@/lib/moderation-auth";
import { getTenantSlug } from "@/lib/tenant/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const slug = await getTenantSlug();
  if (!isModerationConfigured(slug)) {
    return NextResponse.json({ ok: false, configured: false });
  }
  const c = await cookies();
  const v = c.get(moderationCookieName(slug))?.value;
  return NextResponse.json({
    ok: !!(v && verifyModerationToken(slug, v)),
    configured: true,
  });
}

export async function POST(request: Request) {
  const slug = await getTenantSlug();
  if (!isModerationConfigured(slug)) {
    return NextResponse.json({ error: "Moderation not configured" }, { status: 503 });
  }
  const body = (await request.json()) as { password?: string };
  if (!body.password || !verifyModerationPassword(slug, body.password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const token = signModerationSession(slug);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(moderationCookieName(slug), token, moderationCookieOptions());
  return res;
}

export async function DELETE() {
  const slug = await getTenantSlug();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(moderationCookieName(slug), "", {
    ...moderationCookieOptions(),
    maxAge: 0,
  });
  return res;
}
