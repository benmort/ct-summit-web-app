import { NextResponse } from "next/server";
import { secretEquals } from "@/lib/secret-compare";
import { reconcileAllTenants } from "@/lib/upload-reconcile";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }
  if (!secretEquals(request.headers.get("authorization"), `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await reconcileAllTenants();
    return NextResponse.json(result, { status: result.errors.length ? 207 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reconciliation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
