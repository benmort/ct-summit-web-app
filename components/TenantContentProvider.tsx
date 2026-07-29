"use client";

import { createContext, useContext } from "react";
import type { TenantClientContent } from "@/lib/tenant/content";

/**
 * Makes tenant copy available to client components.
 *
 * A client component cannot resolve the tenant itself — that needs request
 * headers, which only the server has. The root layout resolves the tenant once
 * and passes its copy down through this provider.
 */
const TenantContentContext = createContext<TenantClientContent | null>(null);

export default function TenantContentProvider({
  content,
  children,
}: {
  content: TenantClientContent;
  children: React.ReactNode;
}) {
  return (
    <TenantContentContext.Provider value={content}>{children}</TenantContentContext.Provider>
  );
}

export function useTenantContent(): TenantClientContent {
  const content = useContext(TenantContentContext);
  if (!content) {
    throw new Error(
      "useTenantContent must be used inside TenantContentProvider (mounted in app/layout.tsx)",
    );
  }
  return content;
}
