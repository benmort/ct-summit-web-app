import { cookies } from "next/headers";
import { moderationCookieName, verifyModerationToken } from "@/lib/moderation-auth";

/** Whether the current request carries a valid moderation session for this tenant. */
export async function readModerationCookie(slug: string): Promise<boolean> {
  const c = await cookies();
  const v = c.get(moderationCookieName(slug))?.value;
  if (!v) return false;
  return verifyModerationToken(slug, v);
}
