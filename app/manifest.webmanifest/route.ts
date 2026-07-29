import { NextResponse } from "next/server";
import { getTenantContent } from "@/lib/tenant/content";

/**
 * Per-tenant PWA manifest.
 *
 * This is a route handler rather than the conventional app/manifest.ts because a
 * MetadataRoute.Manifest is generated once per deployment and cannot vary by
 * request host — every tenant would have been served the default tenant's name
 * and icons on the home screen.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const { brand } = await getTenantContent();

  return NextResponse.json(
    {
      name: brand.name,
      short_name: brand.name,
      description: brand.description,
      start_url: "/",
      display: "standalone",
      background_color: brand.themeColor,
      theme_color: brand.themeColor,
      icons: brand.assets.androidChrome.map((icon) => ({
        src: icon.url,
        sizes: icon.sizes,
        type: "image/png",
        purpose: "maskable",
      })),
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        // Per-tenant, so it must not be shared across hosts by a CDN.
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    },
  );
}
