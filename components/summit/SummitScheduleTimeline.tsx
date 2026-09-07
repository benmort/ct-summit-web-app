"use client";

import {
  ChevronRightIcon,
  MapPinIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useT } from "@/components/MessagesProvider";
import type { Translate } from "@/lib/i18n/messages";
import type { ScheduleDay, ScheduleSlot } from "@/lib/summit/schedule";

type Props = {
  days: ScheduleDay[];
};

function dayTabContent(day: ScheduleDay, index: number, t: Translate): {
  dateLine: string;
  titleLine: string;
  venueLine: string | null;
  ariaLabel: string;
} {
  const fallbackDayName = t("program.dayNumber", { number: index + 1 });
  const dayName = day.day?.trim() || fallbackDayName;
  const dateLine = day.filterDateLabel || day.dateLabel || dayName;
  const titleLine = day.filterTitle || fallbackDayName;
  const venueLine = day.filterVenue || null;
  const ariaLabel = [dateLine, titleLine, venueLine].filter(Boolean).join(" - ");
  return { dateLine, titleLine, venueLine, ariaLabel };
}

function formatBadge(value: string): string {
  return value.trim().toUpperCase();
}

function dayHashToken(day: ScheduleDay, index: number): string {
  const title = (day.filterTitle || "").toLowerCase();
  if (title.includes("youth")) return "youth-day";
  if (title.includes("first summit") || title.includes("first official")) return "day-1";
  if (title.includes("second summit")) return "day-2";
  if (title.includes("last summit")) return "day-3";
  return `day-${index + 1}`;
}

function dayHash(day: ScheduleDay, index: number): string {
  return `#${dayHashToken(day, index)}`;
}

function dayIndexFromHash(hash: string, days: ScheduleDay[]): number | null {
  const normalizedHash = hash.replace(/^#/, "");
  if (!normalizedHash) return null;

  const hashMatch = days.findIndex((day, index) => dayHashToken(day, index) === normalizedHash);
  if (hashMatch >= 0) return hashMatch;

  // Keep old hash compatibility for existing shared links.
  if (normalizedHash.startsWith("program-day-")) {
    const legacyToken = normalizedHash.slice("program-day-".length);
    const dateKeyMatch = days.findIndex((day) => day.dateKey === legacyToken);
    if (dateKeyMatch >= 0) return dateKeyMatch;
    const numeric = Number(legacyToken);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= days.length) return numeric - 1;
  }

  return null;
}

function defaultProgramDayIndex(days: ScheduleDay[]): number {
  const dayOneIndex = days.findIndex((day, index) => dayHashToken(day, index) === "day-1");
  return dayOneIndex >= 0 ? dayOneIndex : 0;
}

type SessionTone = {
  cardClass: string;
  typeBadgeClass: string;
  kindBadgeClass: string;
  locationBadgeClass: string;
  summaryClass: string;
};

function toneForSessionLabel(sessionLabel: string): SessionTone {
  const normalized = sessionLabel.trim().toLowerCase();
  const isWhite =
    (normalized.includes("break") && !normalized.includes("breakout")) ||
    normalized.includes("logistics") ||
    normalized.includes("social");
  const isYellow = !isWhite;

  if (isYellow) {
    return {
      cardClass: "border-brand-300/35 bg-brand-950/20",
      typeBadgeClass: "border border-brand-300/45 bg-brand-400/20 text-brand-100",
      kindBadgeClass: "border border-brand-200/35 bg-brand-500/10 text-brand-100/95",
      locationBadgeClass: "border border-brand-200/30 bg-brand-950/35 text-brand-100/90",
      summaryClass: "text-ink-200",
    };
  }

  return {
    cardClass: "border-veil/20 bg-surface-900/55",
    typeBadgeClass: "border border-veil/30 bg-veil/10 text-ink-50",
    kindBadgeClass: "border border-veil/25 bg-veil/5 text-ink-100",
    locationBadgeClass: "border border-veil/20 bg-scrim/30 text-ink-200",
    summaryClass: "text-ink-300",
  };
}

function ScheduleCard({ slot }: { slot: ScheduleSlot }) {
  const t = useT();
  const href = slot.talk ? `/speakers/${slot.id}` : `/events/${slot.id}`;
  const speakerLabel =
    slot.speaker || t(slot.talk ? "program.sessionSpeaker" : "program.eventSession");
  const locationLabel = slot.locationLabel || slot.room;
  const speakerSubLabel = slot.organisation || locationLabel;
  const speakerSubLabelIsLocation = !slot.organisation && !!locationLabel;
  // Tone keys off the untranslated label on purpose: the colour rules match
  // English words in the source data, so they must not see a translated string.
  const sessionLabel = slot.formatLabel || (slot.talk ? "Talk" : "Event");
  const sessionBadgeLabel =
    slot.formatLabel || t(slot.talk ? "program.formatTalk" : "program.formatEvent");
  const tone = toneForSessionLabel(sessionLabel);
  const cardClass = `relative overflow-hidden rounded-xl border p-3.5 transition sm:p-4 ${tone.cardClass}`;

  return (
    <Link
      href={href}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/80"
    >
      <article className={`${cardClass} group-hover:border-veil/30 group-hover:bg-surface-900/75`}>
        <div className="mb-2 flex flex-wrap items-center gap-1.5 pl-1">
          <span className={`rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${tone.typeBadgeClass}`}>
            {formatBadge(sessionBadgeLabel)}
          </span>
          {slot.talk ? (
            <span className={`rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${tone.kindBadgeClass}`}>
              {t("program.badgeSpeaker")}
            </span>
          ) : null}
        </div>

        <h3 className="pl-1 text-[15px] font-semibold leading-5 text-ink-50">{slot.title}</h3>
        {slot.summary ? <p className={`mt-1.5 break-words pl-1 text-xs leading-5 ${tone.summaryClass}`}>{slot.summary}</p> : null}

        <div className="mt-3 flex items-end justify-between gap-3 pl-1">
          {slot.talk ? (
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <div className="relative h-7 w-7 overflow-hidden rounded-full border border-veil/15 bg-veil/5">
                  {slot.imageUrl ? (
                    <Image src={slot.imageUrl} alt={speakerLabel} fill className="object-cover" unoptimized />
                  ) : (
                    <UserCircleIcon className="h-full w-full p-1 text-ink-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink-200 break-words">{speakerLabel}</p>
                  {speakerSubLabel ? (
                    <p className="text-[10px] uppercase tracking-[0.12em] text-ink-500 break-words">
                      {speakerSubLabelIsLocation ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPinIcon className="h-3 w-3 shrink-0" aria-hidden />
                          <span>{speakerSubLabel}</span>
                        </span>
                      ) : (
                        speakerSubLabel
                      )}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="min-w-0 flex-1 space-y-1">
              {slot.presenter ? (
                <p className="text-xs font-medium text-ink-200 break-words">
                  {t("program.presentedBy", { name: slot.presenter })}
                </p>
              ) : null}
              <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-ink-500 break-words">
                <MapPinIcon className="h-3 w-3 shrink-0" aria-hidden />
                <span>{locationLabel}</span>
              </p>
            </div>
          )}
          <span className="inline-flex min-h-8 items-center gap-1 rounded-sm px-1 py-0.5 text-xs font-medium text-brand-200 transition group-hover:text-brand-100">
            {t("program.viewDetails")}
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </span>
        </div>
      </article>
    </Link>
  );
}

export default function SummitScheduleTimeline({ days }: Props) {
  const t = useT();
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useLayoutEffect(() => {
    if (!days.length) return;
    const indexFromHash = dayIndexFromHash(window.location.hash, days);
    setActiveDayIndex(indexFromHash ?? defaultProgramDayIndex(days));
  }, [days]);

  useEffect(() => {
    if (activeDayIndex === null) return;
    if (activeDayIndex > days.length - 1) setActiveDayIndex(defaultProgramDayIndex(days));
  }, [activeDayIndex, days]);

  useEffect(() => {
    if (!days.length) return;
    const onHashChange = () => {
      const indexFromHash = dayIndexFromHash(window.location.hash, days);
      if (indexFromHash !== null) {
        setActiveDayIndex(indexFromHash);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [days]);

  useEffect(() => {
    if (activeDayIndex === null) return;
    if (!days.length) return;
    const activeDay = days[activeDayIndex] ?? days[0];
    if (!activeDay) return;
    const nextHash = dayHash(activeDay, activeDayIndex);
    if (window.location.hash === nextHash) return;
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [activeDayIndex, days]);

  const panelDayIndex = activeDayIndex ?? defaultProgramDayIndex(days);

  function moveFocus(nextIndex: number) {
    setActiveDayIndex(nextIndex);
    requestAnimationFrame(() => tabRefs.current[nextIndex]?.focus());
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div
        role="tablist"
        aria-orientation="horizontal"
        aria-label={t("program.daysTablistLabel")}
        className="grid grid-cols-2 gap-2.5 sm:gap-3"
      >
        {days.map((day, index) => {
          const selected = activeDayIndex !== null && index === activeDayIndex;
          const tabId = `schedule-day-tab-${index}`;
          const panelId = `schedule-day-panel-${index}`;
          const tabContent = dayTabContent(day, index, t);
          const buttonClass = selected
            ? "group relative min-h-[76px] w-full cursor-pointer overflow-hidden rounded-xl border border-brand-300/45 bg-gradient-to-br from-brand-200 to-brand-100 px-3.5 py-3 text-left text-on-brand shadow-[0_10px_28px_rgba(245,158,11,0.25)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200/80"
            : "group relative min-h-[76px] w-full cursor-pointer overflow-hidden rounded-xl border border-dashed border-ink-500/55 bg-surface-950/40 px-3.5 py-3 text-left text-ink-300/95 transition hover:-translate-y-0.5 hover:border-brand-300/45 hover:bg-surface-900/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200/80";
          const dateClass = selected
            ? "block text-[10px] uppercase tracking-[0.12em] text-on-brand-muted"
            : "block text-[10px] uppercase tracking-[0.12em] text-ink-500/90";
          const titleClass = selected
            ? "mt-1 block text-sm font-semibold leading-5 text-on-brand"
            : "mt-1 block text-sm font-semibold leading-5 text-ink-200";
          const venueClass = selected
            ? "mt-0.5 block text-[11px] leading-4 text-on-brand-muted"
            : "mt-0.5 block text-[11px] leading-4 text-ink-500";
          return (
            <button
              key={`${day.day}-${index}`}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={tabId}
              type="button"
              role="tab"
              aria-controls={panelId}
              aria-selected={selected}
              aria-label={tabContent.ariaLabel}
              tabIndex={selected || (activeDayIndex === null && index === 0) ? 0 : -1}
              onClick={() => setActiveDayIndex(index)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  moveFocus((index + 1) % days.length);
                } else if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  moveFocus((index - 1 + days.length) % days.length);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  moveFocus(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  moveFocus(days.length - 1);
                }
              }}
              className={buttonClass}
            >
              <span
                aria-hidden
                className={
                  selected
                    ? "absolute inset-y-2 left-1 w-1 rounded-full bg-surface-900/25"
                    : "absolute inset-y-2 left-1 w-1 rounded-full bg-brand-300/40 opacity-0 transition-opacity group-hover:opacity-100"
                }
              />
              {!selected ? (
                <span className="pointer-events-none absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-brand-300/35 bg-surface-900/70 text-brand-200/90 opacity-80 transition group-hover:border-brand-300/60 group-hover:opacity-100">
                  <ChevronRightIcon className="h-3 w-3" aria-hidden />
                </span>
              ) : (
                <span className="pointer-events-none absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-surface-900/20 bg-surface-900/10">
                  <span className="h-2 w-2 rounded-full bg-surface-900/60" />
                </span>
              )}
              <span className={dateClass}>{tabContent.dateLine}</span>
              <span className={titleClass}>{tabContent.titleLine}</span>
              {tabContent.venueLine ? (
                <span className={venueClass}>{tabContent.venueLine}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/*
        Every day is rendered, and the inactive ones are hidden rather than left
        unmounted. Two reasons: the whole programme is then in the server-rendered
        HTML, where browser translation can reach it — it used to arrive only after
        hydration — and switching tabs moves no text nodes, so a translation the
        browser has already applied survives the switch instead of reverting.
      */}
      {days.map((day, dayIndex) => (
        <div
          key={`${day.day}-${dayIndex}`}
          id={`schedule-day-panel-${dayIndex}`}
          role="tabpanel"
          aria-labelledby={`schedule-day-tab-${dayIndex}`}
          hidden={dayIndex !== panelDayIndex}
          className={
            dayIndex === panelDayIndex ? "relative space-y-5 sm:space-y-6" : "hidden"
          }
        >
          {day.sections.length ? (
            <>
              <span
                aria-hidden
                className="absolute bottom-0 left-[63px] top-0 w-px bg-veil/10 sm:left-[75px]"
              />
              {day.sections.map((section, sectionIndex) => (
                <section
                  key={`${day.day}-${section.title}-${sectionIndex}`}
                  className="grid grid-cols-[52px_1fr] gap-4 sm:grid-cols-[64px_1fr] sm:gap-5"
                >
                  <div className="pt-0.5">
                    <p className="text-sm font-semibold text-ink-100">{section.startLabel} -</p>
                    <p className="text-sm text-ink-500">{section.endLabel}</p>
                  </div>

                  <div className="relative space-y-2 pl-1 sm:pl-2">
                    <span
                      aria-hidden
                      className={
                        sectionIndex === 0
                          ? "absolute -left-[10px] top-2 h-2.5 w-2.5 rounded-full border border-brand-300/80 bg-brand-400 sm:-left-[14px]"
                          : "absolute -left-[10px] top-2 h-2.5 w-2.5 rounded-full border border-brand-200/70 bg-surface-950 sm:-left-[14px]"
                      }
                    />

                    {section.data.map((slot) => (
                      <ScheduleCard key={`${section.title}-${slot.id}`} slot={slot} />
                    ))}
                  </div>
                </section>
              ))}
            </>
          ) : (
            <section className="rounded-xl border border-veil/10 bg-veil/5 p-4">
              <p className="text-sm text-ink-300">{t("program.dayPending")}</p>
            </section>
          )}
        </div>
      ))}

      <p className="inline-flex items-center gap-1 text-[11px] text-ink-500">
        <MapPinIcon className="h-3.5 w-3.5" />
        {t("program.timesSubjectToChange")}
      </p>
    </div>
  );
}
