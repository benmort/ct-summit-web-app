import { NextResponse } from "next/server";
import { getTenantSlug } from "@/lib/tenant/server";
import { isModerationConfigured } from "@/lib/moderation-auth";
import { readModerationCookie } from "@/lib/server-moderation";
import { getPhotoStorage } from "@/lib/storage";
import { ensureUploadAuthorized } from "@/lib/upload-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const tenantSlug = await getTenantSlug();
  try {
    await ensureUploadAuthorized(request, tenantSlug);
    if (!isModerationConfigured(tenantSlug)) {
      return NextResponse.json({ error: "Moderation not configured" }, { status: 503 });
    }
    const allowed = await readModerationCookie(tenantSlug);
    if (!allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const storage = getPhotoStorage(tenantSlug);
    if (!storage.repairManifest) {
      return NextResponse.json(
        { repaired: false, details: ["Storage backend has no repair operation"] },
        { status: 200 },
      );
    }
    const result = await storage.repairManifest();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Repair failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
