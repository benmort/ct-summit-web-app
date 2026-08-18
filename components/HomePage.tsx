"use client";

import { Dialog } from "@headlessui/react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useT } from "@/components/MessagesProvider";
import type { Photo } from "@/lib/types/photo";
import { galleryPath, type GalleryMode } from "@/utils/galleryUrl";
import ModerationLogin from "./ModerationLogin";
import PhotoGallery from "./PhotoGallery";
import PhotoModal from "./PhotoModal";
import ScrollToTop from "./ScrollToTop";
import ShowreelCarousel from "./ShowreelCarousel";
import ShowreelFooter from "./ShowreelFooter";

const INITIAL_PAGE = 12;
const PAGE = 30;

type Props = {
  mode?: GalleryMode;
  /**
   * Env prefix for this tenant's moderation secrets, used only to print the
   * correct variable names in the "not configured" hint. A variable name is not
   * a secret; the values are never sent to the browser.
   */
  moderationEnvPrefix?: string;
};

export default function HomePage({
  mode = "gallery",
  moderationEnvPrefix = "MODERATION",
}: Props) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showreel = mode === "showreel";
  const moderation = mode === "moderation";
  // Gallery and moderation both require the password; showreel stays public (kiosk).
  const gated = mode !== "showreel";

  const homeHref = galleryPath(null, "gallery");

  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [moderationChecked, setModerationChecked] = useState(!gated);
  const [moderationOk, setModerationOk] = useState(!gated);
  const [moderationConfigured, setModerationConfigured] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());
  const brokenIdsRef = useRef(brokenIds);
  brokenIdsRef.current = brokenIds;
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  const markBroken = useCallback((id: string) => {
    setBrokenIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const validatePhotos = useCallback(
    (list: Photo[]) => {
      const known = brokenIdsRef.current;
      const unchecked = list.filter((p) => !known.has(p.id));
      if (!unchecked.length) return;
      void Promise.allSettled(
        unchecked.map(async (p) => {
          try {
            const res = await fetch(p.url, { method: "HEAD" });
            if (!res.ok) markBroken(p.id);
          } catch {
            markBroken(p.id);
          }
        }),
      );
    },
    [markBroken],
  );

  const normalizePhoto = useCallback((p: Photo): Photo => ({
    ...p,
    kind: p.kind === "video" ? "video" : "image",
  }), []);

  const photoId = searchParams?.get("photoId") ?? null;

  // Load only the first page. Opening/closing a photo must NOT reload or reset the
  // wall — deep-links to an off-page photo are handled separately below.
  const load = useCallback((): Promise<void> => {
    setError(null);
    return fetch(`/api/photos?offset=0&limit=${INITIAL_PAGE}`)
      .then((r) => {
        if (!r.ok) throw new Error("bad");
        return r.json();
      })
      .then((data: unknown) => {
        const body = data as {
          photos?: Photo[];
          total?: number;
        };
        if (!Array.isArray(body.photos) || typeof body.total !== "number") {
          throw new Error("bad");
        }
        const list = body.photos.map(normalizePhoto);
        setPhotos(list);
        setTotal(body.total);
        validatePhotos(list);
      })
      .catch(() => {
        setError(t("moments.loadError"));
        setPhotos(null);
        setTotal(0);
      });
  }, [normalizePhoto, validatePhotos, t]);

  const loadMoreInFlight = useRef(false);
  const fullListLoadedRef = useRef(false);

  const loadMore = useCallback(() => {
    if (loadMoreInFlight.current || !photos || photos.length >= total) return;
    loadMoreInFlight.current = true;
    void fetch(`/api/photos?offset=${photos.length}&limit=${PAGE}`)
      .then((r) => {
        if (!r.ok) throw new Error("bad");
        return r.json();
      })
      .then((data: unknown) => {
        const body = data as { photos?: Photo[]; total?: number };
        if (!Array.isArray(body.photos)) throw new Error("bad");
        const newPhotos = body.photos.map(normalizePhoto);
        setPhotos((prev) => [...(prev ?? []), ...newPhotos]);
        if (typeof body.total === "number") setTotal(body.total);
        validatePhotos(newPhotos);
      })
      .catch(() => {
        setError(t("moments.loadMoreError"));
      })
      .finally(() => {
        loadMoreInFlight.current = false;
      });
  }, [photos, total, normalizePhoto, validatePhotos, t]);

  useEffect(() => {
    const el = loadMoreSentinelRef.current;
    if (!el || photos === null || photos.length >= total) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.length > 0 && entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "400px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [photos, total, loadMore]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!gated) {
      setModerationChecked(true);
      setModerationOk(true);
      return;
    }
    let cancelled = false;
    void fetch("/api/auth/moderation")
      .then((r) => r.json())
      .then((data: { ok?: boolean; configured?: boolean }) => {
        if (cancelled) return;
        setModerationConfigured(data.configured !== false);
        setModerationOk(!!data.ok);
        setModerationChecked(true);
      })
      .catch(() => {
        if (cancelled) return;
        setModerationOk(false);
        setModerationChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [gated]);

  // Deep-link: a requested photo that isn't in the first page needs the full list.
  // Only fires when opening such a photo — never on close — so the wall is preserved.
  useEffect(() => {
    if (!photoId || photos === null) return;
    if (photos.some((p) => p.id === photoId)) return;
    if (fullListLoadedRef.current) return;
    fullListLoadedRef.current = true;
    void fetch("/api/photos")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad"))))
      .then((data: unknown) => {
        if (!Array.isArray(data)) return;
        const list = (data as Photo[]).map(normalizePhoto);
        setPhotos(list);
        setTotal(list.length);
        validatePhotos(list);
      })
      .catch(() => {
        /* fall through to the redirect effect below */
      });
  }, [photoId, photos, normalizePhoto, validatePhotos]);

  useEffect(() => {
    if (!photoId || photos === null || photos.length === 0) return;
    const ok = photos.some((p) => p.id === photoId);
    // Only bail out once we've tried the full list, so deep-links aren't bounced early.
    if (!ok && fullListLoadedRef.current) {
      router.replace(galleryPath(null, mode), { scroll: false });
    }
  }, [photoId, photos, router, mode]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const performBulkDelete = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const results = await Promise.all(
      ids.map((id) =>
        fetch(`/api/photos/${encodeURIComponent(id)}`, { method: "DELETE" }),
      ),
    );
    const failed = results.filter((r) => !r.ok);
    if (failed.length) {
      window.alert(t("moments.deleteFailed", { count: failed.length }));
      return;
    }
    const remove = new Set(ids);
    setSelectedIds(new Set());
    setPhotos((prev) => prev?.filter((p) => !remove.has(p.id)) ?? null);
    setTotal((prevTotal) => Math.max(0, prevTotal - ids.length));
  }, [t]);

  const confirmDeleteSelected = useCallback(async () => {
    const ids = [...selectedIds];
    setDeleteConfirmOpen(false);
    if (ids.length === 0) return;
    await performBulkDelete(ids);
  }, [selectedIds, performBulkDelete]);

  const errorBanner = error && photos === null && (
    <div
      role="alert"
      className={
        showreel
          ? "relative z-10 mx-auto mt-2 w-full max-w-lg shrink-0 rounded-xl bg-brand-950/40 px-4 py-3 text-center text-sm text-brand-100 ring-1 ring-brand-500/30 sm:mx-5"
          : "mx-auto mb-6 max-w-lg rounded-xl bg-brand-950/40 px-4 py-3 text-center text-sm text-brand-100 ring-1 ring-brand-500/30"
      }
    >
      {error}
      <button
        type="button"
        onClick={() => {
          setPhotos(null);
          void load();
        }}
        className="mt-2 block w-full text-center font-medium text-brand-300 underline"
      >
        {t("moments.retry")}
      </button>
    </div>
  );

  if (showreel) {
    return (
      <>
        <div className="fixed inset-0 z-0 flex flex-col bg-scrim">
          {errorBanner}
          <ShowreelCarousel
            photos={photos}
            loading={photos === null && !error}
            brokenIds={brokenIds}
          />
          <ShowreelFooter />
        </div>
        {photos && photos.length > 0 && (
          <PhotoModal
            photos={photos}
            mode={mode}
            brokenIds={brokenIds}
            onPhotosReload={load}
          />
        )}
      </>
    );
  }

  const showGallery =
    !gated ||
    (moderationChecked &&
      (moderationOk || !moderationConfigured));
  const moderationActive =
    moderation && moderationConfigured && moderationOk;

  return (
    <>
      <ScrollToTop />
      <main className="mx-auto w-full max-w-[460px] px-0 pb-16 pt-3 sm:max-w-[1024px] sm:px-0 sm:pt-5 lg:max-w-[1240px]">
        {errorBanner}

        {gated && moderationChecked && !moderationConfigured && (
          <div
            role="alert"
            className="mx-auto mb-6 max-w-lg rounded-xl bg-brand-950/40 px-4 py-3 text-center text-sm text-brand-100 ring-1 ring-brand-500/30"
          >
            <p className="font-medium">{t("moments.moderationNotConfigured")}</p>
            <p className="mt-2 text-brand-100/90">
              Set <code className="rounded bg-scrim/30 px-1 py-0.5 text-xs">MODERATION_SECRET</code>{" "}
              (16+ characters) and{" "}
              <code className="rounded bg-scrim/30 px-1 py-0.5 text-xs">MODERATION_PASSWORD</code>{" "}
              (6+ characters). These are shared by every event on this deployment.
              Locally: add them to{" "}
              <code className="rounded bg-scrim/30 px-1 py-0.5 text-xs">.env.local</code> and restart
              the dev server. On Vercel: Project → Settings → Environment Variables, then redeploy.
            </p>
            {moderationEnvPrefix !== "MODERATION" && (
              <p className="mt-2 text-brand-100/70">
                To give this event its own password instead, set{" "}
                <code className="rounded bg-scrim/30 px-1 py-0.5 text-xs">
                  {moderationEnvPrefix}_SECRET
                </code>{" "}
                and{" "}
                <code className="rounded bg-scrim/30 px-1 py-0.5 text-xs">
                  {moderationEnvPrefix}_PASSWORD
                </code>
                .
              </p>
            )}
          </div>
        )}

        {gated &&
          moderationChecked &&
          moderationConfigured &&
          !moderationOk && (
          <ModerationLogin
            onSuccess={() => {
              setModerationOk(true);
              void load();
            }}
          />
        )}

        {showGallery && (
          <>
            <PhotoGallery
              lead={
                moderation ? (
                  <div className="relative mb-4 break-inside-avoid sm:mb-5">
                    <div className="flex w-full flex-col gap-3">
                      <Link
                        href={homeHref}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-veil/15 bg-veil/5 px-3 py-2 text-sm font-medium text-on-scrim backdrop-blur-sm transition hover:bg-veil/10"
                      >
                        <ArrowLeftIcon className="h-4 w-4 shrink-0" aria-hidden />
                        {t("moments.backToGallery").toUpperCase()}
                      </Link>
                      {moderationActive && selectedIds.size > 0 && (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmOpen(true)}
                          className="inline-flex w-full items-center justify-center rounded-lg border border-danger-500/40 bg-danger-950/50 px-3 py-2 text-sm font-medium text-danger-100 transition hover:bg-danger-950/80"
                        >
                          {t("moments.deleteSelected", { count: selectedIds.size })}
                        </button>
                      )}
                    </div>
                  </div>
                ) : null
              }
              photos={photos}
              photosLoading={photos === null && !error}
              mode={mode}
              moderationMode={moderationActive}
              brokenIds={brokenIds}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />

            {photos !== null && photos.length < total && (
              <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8">
                <div
                  ref={loadMoreSentinelRef}
                  className="h-px w-full max-w-md"
                  aria-hidden
                />
                <span
                  className="h-6 w-6 animate-spin rounded-full border-2 border-veil/25 border-t-veil/80"
                  role="status"
                  aria-label={t("moments.loadingMore")}
                />
                <p className="text-[11px] text-on-scrim-muted">
                  {t("moments.showingCount", { shown: photos.length, total })}
                </p>
              </div>
            )}
          </>
        )}

        {photos && photos.length > 0 && showGallery && (
          <PhotoModal
            photos={photos}
            mode={mode}
            brokenIds={brokenIds}
            onPhotosReload={load}
          />
        )}
      </main>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        className="relative z-[200]"
      >
        <Dialog.Overlay className="fixed inset-0 bg-scrim/60 backdrop-blur-sm" />
        <div className="fixed inset-0 overflow-y-auto overflow-x-hidden">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <Dialog.Panel className="w-full max-w-md rounded-2xl border border-veil/15 bg-surface-900/95 p-5 shadow-xl ring-1 ring-veil/10 sm:p-6">
              <Dialog.Title className="text-balance text-center text-base font-semibold leading-snug text-on-scrim sm:text-lg">
                {selectedIds.size === 1
                  ? t("moments.deleteConfirmTitleOne")
                  : t("moments.deleteConfirmTitleMany", { count: selectedIds.size })}
              </Dialog.Title>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="rounded-lg border border-veil/20 bg-veil/5 px-4 py-2.5 text-sm font-medium text-on-scrim transition hover:bg-veil/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900"
                >
                  {t("moments.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => void confirmDeleteSelected()}
                  className="rounded-lg border border-danger-500/50 bg-danger-950/60 px-4 py-2.5 text-sm font-medium text-danger-100 transition hover:bg-danger-950/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900"
                >
                  {t("moments.delete")}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
