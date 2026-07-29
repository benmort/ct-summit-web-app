import { NextResponse, type NextRequest } from "next/server";
import {
  TENANT_HEADER,
  hostFromHeaders,
  identityForSlug,
  redirectsForSlug,
  resolveTenantSlug,
} from "@/lib/tenant/domains";
import { tenantFeatures } from "@/lib/tenant/types";

/**
 * Everything belonging to the shared photo gallery — pages, media API, upload
 * broker and moderation login. Gated in one place so a tenant with the feature
 * off cannot reach another tenant's album through a route we forgot to guard.
 */
const MOMENTS_ROUTES = [
  /^\/moments(?:\/|$)/,
  /^\/api\/photos(?:\/|$)/,
  /^\/api\/blob\/upload$/,
  /^\/api\/auth\/moderation$/,
];

/**
 * Resolves the tenant from the request host and forwards it to the app as a
 * request header. Also serves each tenant's outbound redirects, which used to
 * live in next.config.ts — those are global, and these differ per tenant.
 */
export function middleware(request: NextRequest) {
  const slug = resolveTenantSlug(hostFromHeaders(request.headers));

  const { pathname } = request.nextUrl;

  const redirect = redirectsForSlug(slug).find((r) => r.source === pathname);
  if (redirect) {
    return NextResponse.redirect(redirect.destination, 307);
  }

  const identity = identityForSlug(slug);
  if (
    identity &&
    !tenantFeatures(identity).moments &&
    MOMENTS_ROUTES.some((re) => re.test(pathname))
  ) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const headers = new Headers(request.headers);
  // Unconditional set, never append: a client could otherwise send its own
  // x-tenant header and read another tenant's content from this host.
  headers.set(TENANT_HEADER, slug);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Everything except Next's build output and static asset requests. API routes
  // are deliberately included — they need the tenant too.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|mp4|webm|pdf|txt|xml|webmanifest)$).*)",
  ],
};
