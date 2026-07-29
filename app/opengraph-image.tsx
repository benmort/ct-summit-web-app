import { ImageResponse } from "next/og";
import { getTenantContent } from "@/lib/tenant/content";
import { getTenantIdentity } from "@/lib/tenant/server";

/**
 * Per-tenant social card.
 *
 * Runs on the Node runtime rather than edge so it can use the same server-only
 * tenant content loader as the rest of the app, and is force-dynamic because the
 * card depends on the request host.
 */
export const dynamic = "force-dynamic";

export const alt = "Summit social card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const [tenant, { brand }] = await Promise.all([getTenantIdentity(), getTenantContent()]);
  const isDark = tenant.theme.mode === "dark";

  const background = isDark
    ? "linear-gradient(145deg, #0c0a09 0%, #292524 50%, #0c0a09 100%)"
    : "linear-gradient(145deg, #fafaf9 0%, #e7e5e4 50%, #fafaf9 100%)";
  const color = isDark ? "#fafaf9" : "#1c1917";

  return new ImageResponse(
    (
      <div
        style={{
          background,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color,
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        {brand.name}
      </div>
    ),
    { ...size },
  );
}
