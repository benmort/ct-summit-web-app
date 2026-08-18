"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useMemo } from "react";
import SummitPageHeader from "@/components/summit/SummitPageHeader";
import { useT } from "@/components/MessagesProvider";
import { roleHash } from "@/lib/summit/crew-filters";

type Props = {
  title: string;
  pageSubtitle: string;
  contentBody: string;
  /** Tenant's contact address, auto-linked wherever it appears in the copy. */
  supportEmail: string;
  /** Printable version. Null hides the download button rather than 404ing. */
  pdfUrl: string | null;
};

type ConductSection = {
  title: string;
  paragraphs: string[];
  bulletItems: string[];
};

type ContentBlock =
  | { type: "paragraph"; value: string }
  | { type: "section"; section: ConductSection }
  | { type: "principlesButton" };

/**
 * Marker line in the authored content body, matched verbatim and replaced by the
 * PDF button. It is a parsing token, not display copy — the button's own label is
 * translated from the message catalogue.
 */
const PRINCIPLES_LINE = "Please find the pintable PDF version here.";
const WELLBEING_ROLE = "Wellbeing and Grievance Coordinator";
const HEADING_MARKER = "## ";

const SECTION_TITLE_HINTS = new Set([
  "our shared commitments",
  "how we show up",
  "care, safety & community",
  "shared responsibility",
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isSectionHeading(line: string, nextNonEmpty: string | null): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed === PRINCIPLES_LINE) return false;
  if (trimmed.startsWith("- ")) return false;
  // An explicit marker, because the heuristics below cannot see a heading whose
  // first following line is itself a lead-in ("We agree to:") rather than a bullet.
  if (trimmed.startsWith(HEADING_MARKER)) return true;
  if (SECTION_TITLE_HINTS.has(trimmed.toLowerCase())) return true;
  if (trimmed.endsWith(":")) return false;
  return Boolean(nextNonEmpty && nextNonEmpty.trim().startsWith("- "));
}

function headingText(line: string): string {
  const trimmed = line.trim();
  return trimmed.startsWith(HEADING_MARKER) ? trimmed.slice(HEADING_MARKER.length).trim() : trimmed;
}

function renderInlineContent(value: string, supportEmail: string): React.ReactNode {
  const pattern = new RegExp(`(https?:\\/\\/\\S+|${escapeRegExp(supportEmail)})`, "g");
  return value.split(pattern).map((chunk, index) => {
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

function toContentBlocks(contentBody: string, untitledSectionTitle: string): ContentBlock[] {
  const normalized = contentBody
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n");

  const lines = normalized.split("\n");
  const blocks: ContentBlock[] = [];
  let currentSection: ConductSection | null = null;
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    const value = paragraphLines.join("\n").trim();
    if (!value) {
      paragraphLines = [];
      return;
    }
    if (currentSection) {
      currentSection.paragraphs.push(value);
    } else {
      blocks.push({ type: "paragraph", value });
    }
    paragraphLines = [];
  };

  const flushSection = () => {
    if (!currentSection) return;
    flushParagraph();
    blocks.push({ type: "section", section: currentSection });
    currentSection = null;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    const nextNonEmptyLine = lines.slice(i + 1).find((candidate) => candidate.trim() !== "") ?? null;

    if (line.trim() === PRINCIPLES_LINE) {
      flushSection();
      flushParagraph();
      blocks.push({ type: "principlesButton" });
      continue;
    }

    if (trimmed === "") {
      flushParagraph();
      continue;
    }

    if (isSectionHeading(line, nextNonEmptyLine)) {
      flushSection();
      currentSection = { title: headingText(line), paragraphs: [], bulletItems: [] };
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      if (!currentSection) {
        currentSection = { title: untitledSectionTitle, paragraphs: [], bulletItems: [] };
      }
      currentSection.bulletItems.push(trimmed.replace(/^-+\s*/, ""));
      continue;
    }

    paragraphLines.push(trimmed);
  }

  flushSection();
  flushParagraph();
  return blocks;
}

export default function SummitCodeConductContent({
  title,
  pageSubtitle,
  contentBody,
  supportEmail,
  pdfUrl,
}: Props) {
  const t = useT();
  const untitledSectionTitle = t("pages.codeConductTitle");
  const blocks = useMemo(
    () => toContentBlocks(contentBody, untitledSectionTitle),
    [contentBody, untitledSectionTitle],
  );

  const pdfButton = pdfUrl ? (
    <a
      href={pdfUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-veil/25 bg-scrim/25 px-4 py-2.5 text-sm font-semibold text-ink-100 transition hover:bg-scrim/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
    >
      {t("pages.codeConductPdfLink")}
    </a>
  ) : null;

  return (
    <>
      <div className="w-full space-y-4">
        <SummitPageHeader title={title} subtitle={pageSubtitle} />
        <div className="space-y-3">
          {blocks.map((block, index) => {
            if (block.type === "principlesButton") {
              if (!pdfButton) return null;
              return (
                <article key={`principles-${index}`} className="rounded-xl border border-veil/10 bg-surface-900/70 p-4 sm:p-5">
                  {pdfButton}
                </article>
              );
            }

            if (block.type === "section") {
              return (
                <article key={`section-${block.section.title}-${index}`} className="rounded-xl border border-veil/10 bg-surface-900/70 p-4 sm:p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-200">
                    {block.section.title}
                  </h2>
                  {block.section.paragraphs.length > 0 ? (
                    <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-200">
                      {block.section.paragraphs.map((paragraph) => (
                        <p key={`${block.section.title}-${paragraph}`}>
                          {paragraph.split("\n").map((line, lineIndex) => (
                            <span key={`${line}-${lineIndex}`}>
                              {lineIndex > 0 ? <br /> : null}
                              {renderInlineContent(line, supportEmail)}
                            </span>
                          ))}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {block.section.bulletItems.length > 0 ? (
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-200 marker:text-brand-200">
                      {block.section.bulletItems.map((item) => (
                        <li key={`${block.section.title}-${item}`}>{renderInlineContent(item, supportEmail)}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              );
            }

            return (
              <article key={`paragraph-${index}`} className="rounded-xl border border-veil/10 bg-surface-900/70 p-4 sm:p-5">
                <div className="space-y-3 text-sm leading-relaxed text-ink-200">
                  <p>
                    {block.value.split("\n").map((line, lineIndex) => (
                      <span key={`${line}-${lineIndex}`}>
                        {lineIndex > 0 ? <br /> : null}
                        {renderInlineContent(line, supportEmail)}
                      </span>
                    ))}
                  </p>
                </div>
              </article>
            );
          })}

          <article className="rounded-xl border border-veil/10 bg-surface-900/70 p-4 sm:p-5">
            {pdfButton}
            <p className={`text-sm leading-relaxed text-ink-200 ${pdfButton ? "mt-4" : ""}`}>
              {t("pages.codeConductReportBody")}
            </p>
            <Link
              href={`/crew${roleHash(WELLBEING_ROLE)}`}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md bg-brand-500 px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-surface-950 transition hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
            >
              {t("pages.codeConductContactWellbeing")}
              <ChevronRightIcon className="h-5 w-5 shrink-0" aria-hidden />
            </Link>
          </article>
        </div>
      </div>
    </>
  );
}
