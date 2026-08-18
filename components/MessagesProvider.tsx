"use client";

import { createContext, useContext, useMemo } from "react";

import { createTranslate, type Messages, type Translate } from "@/lib/i18n/messages";

/**
 * Makes UI strings available to client components.
 *
 * Same shape as TenantContentProvider and for the same reason: a client
 * component cannot resolve the language itself, because that needs the request
 * cookies. The root layout resolves it once and passes the catalogue down.
 */
const MessagesContext = createContext<Messages | null>(null);

export default function MessagesProvider({
  messages,
  children,
}: {
  messages: Messages;
  children: React.ReactNode;
}) {
  return <MessagesContext.Provider value={messages}>{children}</MessagesContext.Provider>;
}

export function useT(): Translate {
  const messages = useContext(MessagesContext);
  if (!messages) {
    throw new Error("useT must be used inside MessagesProvider (mounted in app/layout.tsx)");
  }
  return useMemo(() => createTranslate(messages), [messages]);
}
