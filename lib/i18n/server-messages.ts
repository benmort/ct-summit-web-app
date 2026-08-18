import "server-only";

import { getLocale } from "@/lib/i18n/server";
import { createTranslate, messagesFor, type Messages, type Translate } from "@/lib/i18n/messages";

/** UI strings for the current request's language, for server components. */
export async function getT(): Promise<Translate> {
  return createTranslate(messagesFor(await getLocale()));
}

/** The catalogue itself, to hand down to the client tree once in the root layout. */
export async function getMessages(): Promise<Messages> {
  return messagesFor(await getLocale());
}
