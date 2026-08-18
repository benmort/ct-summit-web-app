import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import SummitPageHeader from "@/components/summit/SummitPageHeader";
import type { Translate } from "@/lib/i18n/messages";
import { getT } from "@/lib/i18n/server-messages";
import { getSummitContext } from "@/lib/summit/context";
import { fieldString } from "@/lib/summit/fields";
import { getVenuesAll } from "@/lib/summit/service";
import type { SummitRecord } from "@/lib/summit/types";
import { getTenantContent } from "@/lib/tenant/content";

function normalizeParagraph(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function splitIntoSentences(value: string): string[] {
  return normalizeParagraph(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function ensureSentence(value: string): string {
  const trimmed = normalizeParagraph(value);
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function twoSentenceVenueSummary(record: SummitRecord, t: Translate): string {
  const descriptions = [
    fieldString(record, "Description"),
    fieldString(record, "Subtitle"),
    fieldString(record, "Instructions"),
  ];
  const sentences: string[] = [];
  for (const block of descriptions) {
    for (const sentence of splitIntoSentences(block)) {
      if (sentences.length >= 2) break;
      if (!sentences.includes(sentence)) sentences.push(sentence);
    }
    if (sentences.length >= 2) break;
  }

  if (sentences.length < 2) {
    const address = fieldString(record, "Address");
    if (address) sentences.push(ensureSentence(t("pages.venueLocatedAt", { address })));
  }

  return sentences.slice(0, 2).join(" ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Auto-links URLs and the tenant's support address inside a guidance paragraph. */
function renderParagraphContent(paragraph: string, supportEmail: string): React.ReactNode {
  const chunks = paragraph.split(
    new RegExp(`(https?:\\/\\/\\S+|${escapeRegExp(supportEmail)})`, "g"),
  );
  return chunks.map((chunk, index) => {
    if (chunk === supportEmail) {
      return (
        <Link key={`${chunk}-${index}`} href={`mailto:${supportEmail}`} className="text-brand-200 underline-offset-2 hover:underline">
          {supportEmail}
        </Link>
      );
    }

    if (/^https?:\/\//.test(chunk)) {
      return (
        <a
          key={`${chunk}-${index}`}
          href={chunk}
          target="_blank"
          rel="noreferrer"
          className="text-brand-200 underline-offset-2 hover:underline"
        >
          {chunk}
        </a>
      );
    }

    return <span key={`${chunk}-${index}`}>{chunk}</span>;
  });
}

type GuidanceBlock = { type: "paragraph"; value: string } | { type: "list"; items: string[] };

/**
 * Groups `- ` prefixed paragraphs into lists.
 *
 * Guidance is authored as an array of paragraphs with no inline formatting, but
 * a lot of practical event copy — what to pack, which vaccinations, what is
 * covered — is genuinely a list. Consecutive `- ` paragraphs become one `<ul>`;
 * everything else is untouched, so content without the marker renders as before.
 */
function toGuidanceBlocks(paragraphs: string[]): GuidanceBlock[] {
  const blocks: GuidanceBlock[] = [];
  for (const paragraph of paragraphs) {
    const bullet = paragraph.match(/^-\s+([\s\S]*)$/);
    if (!bullet) {
      blocks.push({ type: "paragraph", value: paragraph });
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (last?.type === "list") last.items.push(bullet[1]);
    else blocks.push({ type: "list", items: [bullet[1]] });
  }
  return blocks;
}

export default async function Page() {
  const t = await getT();
  const context = await getSummitContext();
  const { guidance, navigation, integrations } = await getTenantContent();
  const venues = (await getVenuesAll(context.selectedSummitName)).sort((a, b) =>
    fieldString(a, "Name").localeCompare(fieldString(b, "Name")),
  );

  return (
    <div className="w-full space-y-4">
      <SummitPageHeader title={guidance.title} subtitle={navigation.pageSubtitles.eventGuidance} />

      <div className="space-y-3">
        {venues.length > 0 ? (
          <article className="rounded-xl border border-veil/10 bg-surface-900/70 p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-200">
              {t("pages.venuesHeading")}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {venues.map((venue) => {
                const venueName = fieldString(venue, "Name") || t("pages.venueFallbackName");
                return (
                  <Link
                    key={venue.id}
                    href={`/venues/${venue.id}`}
                    className="group rounded-lg border border-veil/10 bg-veil/5 p-3 transition hover:border-veil/20 hover:bg-veil/10"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-ink-50">{venueName}</h3>
                      <ChevronRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-200/90 transition group-hover:text-brand-100" />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-ink-300">
                      {twoSentenceVenueSummary(venue, t)}
                    </p>
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-200/90">
                      {t("pages.viewVenuePage")}
                    </p>
                  </Link>
                );
              })}
            </div>
          </article>
        ) : null}

        {guidance.sections.map((section) => (
          <article key={section.title} className="rounded-xl border border-veil/10 bg-surface-900/70 p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-200">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-200">
              {toGuidanceBlocks(section.paragraphs).map((block, index) =>
                block.type === "list" ? (
                  <ul
                    key={`${section.title}-list-${index}`}
                    className="list-disc space-y-2 pl-5 marker:text-brand-200"
                  >
                    {block.items.map((item) => (
                      <li key={`${section.title}-${item}`}>
                        {renderParagraphContent(item, integrations.supportEmail)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p key={`${section.title}-${block.value}`}>
                    {renderParagraphContent(block.value, integrations.supportEmail)}
                  </p>
                ),
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
