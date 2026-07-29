import type { Metadata, Viewport } from "next";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import TenantContentProvider from "@/components/TenantContentProvider";
import { getTenantClientContent, getTenantContent } from "@/lib/tenant/content";
import { resolveTenantFonts } from "@/lib/tenant/fonts";
import { themeStyleSheet } from "@/lib/tenant/ramp";
import { getTenantIdentity } from "@/lib/tenant/server";
import "./globals.css";

/**
 * Each tenant's primary domain is the first entry in its tenant.json. Absolute
 * URLs in metadata must point at the tenant being served, not at a single
 * build-time site URL.
 */
function metadataBaseFor(domains: string[]): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  const primary = domains[0];
  return new URL(primary ? `https://${primary}` : "http://localhost:3000");
}

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantIdentity();
  const { brand } = await getTenantContent();

  return {
    metadataBase: metadataBaseFor(tenant.domains),
    title: {
      default: brand.name,
      template: `%s | ${brand.name}`,
    },
    description: brand.description,
    openGraph: {
      title: brand.name,
      description: brand.description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: brand.name,
      description: brand.description,
    },
    icons: {
      icon: [
        ...brand.assets.faviconPng.map((i) => ({
          url: i.url,
          sizes: i.sizes,
          type: "image/png",
        })),
        { url: brand.assets.favicon, sizes: "any" },
      ],
      apple: [{ url: brand.assets.appleTouchIcon, sizes: "180x180" }],
      shortcut: [brand.assets.favicon],
    },
    // Served by app/manifest.webmanifest/route.ts, which varies by host. A static
    // app/manifest.ts cannot, since it is generated once per deployment.
    manifest: "/manifest.webmanifest",
  };
}

export async function generateViewport(): Promise<Viewport> {
  const { brand } = await getTenantContent();
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    minimumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    themeColor: brand.themeColor,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getTenantIdentity();
  const content = await getTenantClientContent();
  const fonts = resolveTenantFonts(tenant.theme.fonts, tenant.slug);
  // Empty for any tenant that inherits the palette and system fonts in
  // globals.css, which is how the default tenant stays byte-identical to the
  // pre-multi-tenant output.
  const themeCss = themeStyleSheet(tenant.theme, fonts.vars);

  return (
    <html
      lang="en"
      data-tenant={tenant.slug}
      data-theme={tenant.theme.mode}
      className={fonts.classNames || undefined}
    >
      <body className="font-sans">
        {themeCss ? <style dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}
        <RegisterServiceWorker />
        <TenantContentProvider content={content}>{children}</TenantContentProvider>
      </body>
    </html>
  );
}
