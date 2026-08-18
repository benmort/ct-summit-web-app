"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import SummitEmpty from "@/components/summit/SummitEmpty";
import SummitListCard from "@/components/summit/SummitListCard";
import SummitPageHeader from "@/components/summit/SummitPageHeader";
import { buildListItem } from "@/lib/summit/domains";
import { fieldList, fieldString } from "@/lib/summit/fields";
import { useTenantContent } from "@/components/TenantContentProvider";
import { roleFromHash, roleHash } from "@/lib/summit/crew-filters";
import type { SummitRecord } from "@/lib/summit/types";

type Props = {
  records: SummitRecord[];
};

function crewRoles(record: SummitRecord): string[] {
  const roles = fieldList(record, "Role").filter(Boolean);
  if (roles.length > 0) return roles;
  const fallbackRole = fieldString(record, "Role").trim();
  return fallbackRole ? [fallbackRole] : [];
}

export default function SummitCrewListPage({ records }: Props) {
  const { navigation } = useTenantContent();
  const roles = useMemo(
    () => Array.from(new Set(records.flatMap((record) => crewRoles(record)))).sort(),
    [records],
  );
  // Seeded to "all roles" rather than an undefined "not read yet" state, so the
  // crew list is in the server-rendered HTML instead of a loading card. The hash
  // is applied in the layout effect below, before first paint.
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const hasReadHash = useRef(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useLayoutEffect(() => {
    setActiveRole(roleFromHash(window.location.hash, roles));
    hasReadHash.current = true;
  }, [roles]);

  useEffect(() => {
    const onHashChange = () => {
      setActiveRole(roleFromHash(window.location.hash, roles));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [roles]);

  useEffect(() => {
    if (!hasReadHash.current) return;
    if (!activeRole) {
      const cleanUrl = `${window.location.pathname}${window.location.search}`;
      if (window.location.hash) {
        window.history.replaceState(window.history.state, "", cleanUrl);
      }
      return;
    }
    const nextHash = roleHash(activeRole);
    if (window.location.hash === nextHash) return;
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [activeRole]);

  const filteredRecords = activeRole
    ? records.filter((record) => crewRoles(record).includes(activeRole))
    : records;

  function moveFocus(nextIndex: number) {
    requestAnimationFrame(() => tabRefs.current[nextIndex]?.focus());
  }

  if (!records.length) {
    return <SummitEmpty title="No crew yet" body="No crew records were found for this summit." />;
  }

  return (
    <div className="space-y-4">
      <SummitPageHeader title="Crew" subtitle={navigation.pageSubtitles.crew} />
      {roles.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-300">Filter by role</p>
          <div role="tablist" aria-orientation="horizontal" aria-label="Crew roles" className="grid grid-cols-2 gap-2">
            {[
              {
                key: "__all__",
                label: "All roles",
                eyebrow: "Crew",
                selected: activeRole === null,
              },
              ...roles.map((role) => ({
                key: role,
                label: role,
                eyebrow: "Role",
                selected: activeRole === role,
              })),
            ].map((item, index, list) => (
              <button
                key={item.key}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                aria-selected={item.selected}
                tabIndex={item.selected ? 0 : -1}
                onClick={() => {
                  setActiveRole(item.key === "__all__" ? null : item.key);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight") {
                    event.preventDefault();
                    const nextIndex = (index + 1) % list.length;
                    setActiveRole(list[nextIndex].key === "__all__" ? null : list[nextIndex].key);
                    moveFocus(nextIndex);
                  } else if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    const nextIndex = (index - 1 + list.length) % list.length;
                    setActiveRole(list[nextIndex].key === "__all__" ? null : list[nextIndex].key);
                    moveFocus(nextIndex);
                  } else if (event.key === "Home") {
                    event.preventDefault();
                    setActiveRole(null);
                    moveFocus(0);
                  } else if (event.key === "End") {
                    event.preventDefault();
                    const lastIndex = list.length - 1;
                    setActiveRole(list[lastIndex].key);
                    moveFocus(lastIndex);
                  }
                }}
                className={
                  item.selected
                    ? "group relative min-h-[52px] w-full overflow-hidden rounded-xl border border-brand-300/45 bg-gradient-to-br from-brand-200 to-brand-100 px-3 py-2 text-left text-on-brand shadow-[0_10px_28px_rgba(245,158,11,0.25)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200/80"
                    : "group relative min-h-[52px] w-full overflow-hidden rounded-xl border border-dashed border-ink-500/55 bg-surface-950/40 px-3 py-2 text-left text-ink-300/95 transition hover:-translate-y-0.5 hover:border-brand-300/45 hover:bg-surface-900/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200/80 disabled:opacity-85 disabled:hover:translate-y-0 disabled:hover:border-ink-500/55 disabled:hover:bg-surface-950/40"
                }
              >
                <span
                  aria-hidden
                  className={
                    item.selected
                      ? "absolute inset-y-2 left-1 w-1 rounded-full bg-surface-900/25"
                      : "absolute inset-y-2 left-1 w-1 rounded-full bg-brand-300/40 opacity-0 transition-opacity group-hover:opacity-100"
                  }
                />
                {!item.selected ? (
                  <span className="pointer-events-none absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-brand-300/35 bg-surface-900/70 text-brand-200/90 opacity-80 transition group-hover:border-brand-300/60 group-hover:opacity-100">
                    <ChevronRightIcon className="h-3 w-3" aria-hidden />
                  </span>
                ) : (
                  <span className="pointer-events-none absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-surface-900/20 bg-surface-900/10">
                    <span className="h-2 w-2 rounded-full bg-surface-900/60" />
                  </span>
                )}
                <span className={item.selected ? "block text-[9px] uppercase tracking-[0.12em] text-on-brand-muted" : "block text-[9px] uppercase tracking-[0.12em] text-ink-500/90"}>
                  {item.eyebrow}
                </span>
                <span className={item.selected ? "mt-0.5 block text-xs font-semibold leading-4 text-on-brand" : "mt-0.5 block text-xs font-semibold leading-4 text-ink-200"}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {filteredRecords.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredRecords.map((record) => (
            <SummitListCard
              key={record.id}
              href={`/crew/${record.id}`}
              item={buildListItem("crew", record)}
              circularImage
              showImage
            />
          ))}
        </div>
      ) : (
        <SummitEmpty title="No matching crew roles yet" body={`No crew records were found with role: ${activeRole}.`} />
      )}
    </div>
  );
}
