"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useRef,
  useEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { Photo } from "@/lib/types/photo";
import { galleryImageSrcSet } from "@/utils/galleryImageSrcSet";
import { galleryPath, type GalleryMode } from "@/utils/galleryUrl";
import { useLastViewedPhoto } from "@/utils/useLastViewedPhoto";

type Props = {
  /** Optional full-width block above the grid (e.g. moderation controls). */
  lead: ReactNode;
  photos: Photo[] | null;
  photosLoading?: boolean;
  mode?: GalleryMode;
  moderationMode?: boolean;
  brokenIds?: Set<string>;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
};

const VIDEO_POSTER_FALLBACK = "/images/video-poster-fallback.svg";

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`animate-spin rounded-full border-2 border-white/25 border-t-white/80 ${className}`}
      aria-hidden
    />
  );
}

type TileProps = {
  photo: Photo;
  number: number;
  mode: GalleryMode;
  moderationMode: boolean;
  isBroken: boolean;
  selected: boolean;
  onToggleSelect?: (id: string) => void;
  isMobileViewport: boolean;
  innerRef?: RefObject<HTMLAnchorElement>;
};

function GalleryTile({
  photo,
  number,
  mode,
  moderationMode,
  isBroken,
  selected,
  onToggleSelect,
  isMobileViewport,
  innerRef,
}: TileProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={`group relative aspect-[3/2] break-inside-avoid${isBroken ? " opacity-40" : ""}`}
    >
      {isBroken && moderationMode && (
        <span className="absolute right-2 top-2 z-20 rounded-md bg-red-900/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-200 ring-1 ring-red-500/40">
          Missing file
        </span>
      )}
      {!moderationMode && (
        <span className="pointer-events-none absolute left-2 top-2 z-20 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold tabular-nums text-white ring-1 ring-white/20 backdrop-blur-sm">
          {number}
        </span>
      )}
      {moderationMode && onToggleSelect && (
        <label
          className="absolute left-2 top-2 z-20 flex cursor-pointer items-center gap-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm ring-1 ring-white/20"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(photo.id)}
            className="h-4 w-4 rounded border-white/40"
            aria-label={`Select ${photo.filename}`}
          />
          Select
        </label>
      )}
      <Link
        href={galleryPath(photo.id, mode)}
        scroll={false}
        ref={innerRef}
        onClick={(event) => {
          if (!isMobileViewport) return;
          event.preventDefault();
        }}
        className="relative block h-full w-full cursor-default overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60 sm:cursor-zoom-in"
        style={
          photo.blurDataUrl
            ? {
                backgroundImage: `url(${photo.blurDataUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {!loaded && (
          <span className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
            <Spinner className="h-6 w-6" />
          </span>
        )}
        {photo.kind === "video" ? (
          <video
            src={photo.url}
            poster={photo.thumbUrl ?? VIDEO_POSTER_FALLBACK}
            muted
            playsInline
            preload="metadata"
            className={`h-full w-full object-cover transition-opacity duration-700 ease-out ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
            width={photo.width ?? 1280}
            height={photo.height ?? 720}
            aria-label={photo.filename}
            onLoadedData={() => setLoaded(true)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- custom srcSet not supported on next/image here
          <img
            src={photo.wallUrl ?? photo.thumbUrl ?? photo.url}
            srcSet={galleryImageSrcSet(photo) || undefined}
            sizes="(max-width: 1024px) 33vw, 400px"
            alt={photo.filename}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover transition-opacity duration-700 ease-out group-hover:brightness-105 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
        )}
      </Link>
    </div>
  );
}

export default function PhotoGallery({
  lead,
  photos,
  photosLoading,
  mode = "gallery",
  moderationMode = false,
  brokenIds: brokenIdsProp,
  selectedIds = new Set(),
  onToggleSelect,
}: Props) {
  const brokenIds = brokenIdsProp ?? new Set<string>();
  const searchParams = useSearchParams();
  const photoIdOpen = searchParams?.get("photoId") ?? null;
  const [lastViewedPhoto, setLastViewedPhoto] = useLastViewedPhoto();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const lastRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setIsMobileViewport(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (lastViewedPhoto && !photoIdOpen && lastRef.current) {
      lastRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
      setLastViewedPhoto(null);
    }
  }, [lastViewedPhoto, photoIdOpen, setLastViewedPhoto]);

  return (
    <>
      {lead}
      {photosLoading && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-white/5 py-20 text-center text-sm text-stone-400 ring-1 ring-inset ring-white/10">
          <Spinner className="h-6 w-6" />
          Loading photos…
        </div>
      )}
      {/* Row-major grid: photos read left-to-right, top-to-bottom (numbers in order). */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {photos?.map((photo, i) => {
          const isBroken = brokenIds.has(photo.id);
          if (isBroken && !moderationMode) return null;
          return (
            <GalleryTile
              key={photo.id}
              photo={photo}
              number={i + 1}
              mode={mode}
              moderationMode={moderationMode}
              isBroken={isBroken}
              selected={selectedIds.has(photo.id)}
              onToggleSelect={onToggleSelect}
              isMobileViewport={isMobileViewport}
              innerRef={photo.id === lastViewedPhoto ? lastRef : undefined}
            />
          );
        })}
      </div>
    </>
  );
}
