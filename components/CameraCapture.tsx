"use client";

import { CameraIcon, VideoCameraIcon } from "@heroicons/react/24/outline";
import { useId, useRef, useState } from "react";
import { useT } from "@/components/MessagesProvider";
import { validateImageFile, validateVideoFile } from "@/lib/client-validate";

type Props = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  /** Lighter text and controls when placed on a dark hero card */
  onDark?: boolean;
};

export default function CameraCapture({
  onFiles,
  disabled,
  onDark,
}: Props) {
  const t = useT();
  const photoInputId = useId();
  const videoInputId = useId();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const btnClass = (flex1: boolean) =>
    [
      "group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
      flex1 ? "flex-1" : "",
      onDark
        ? "border border-veil/20 bg-surface-950/45 text-ink-50 hover:border-brand-300/45 hover:bg-surface-900/70"
        : "border border-ink-300 bg-panel text-on-panel hover:border-ink-400 hover:bg-ink-50",
    ].join(" ");
  const iconClass = onDark
    ? "h-4 w-4 text-brand-100"
    : "h-4 w-4 text-brand-900";
  const iconWrapClass = onDark
    ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-400/20 ring-1 ring-brand-300/30"
    : "inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 ring-1 ring-brand-200";

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (!f) return;
    const err = validateImageFile(f);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    onFiles([f]);
  };

  const onVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (!f) return;
    const err = validateVideoFile(f);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    onFiles([f]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => photoInputRef.current?.click()}
          className={btnClass(true)}
        >
          <span className={iconWrapClass} aria-hidden>
            <CameraIcon className={iconClass} />
          </span>
          <span>{t("photo.takePhoto")}</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => videoInputRef.current?.click()}
          className={btnClass(true)}
        >
          <span className={iconWrapClass} aria-hidden>
            <VideoCameraIcon className={iconClass} />
          </span>
          <span>{t("photo.takeVideo")}</span>
        </button>
      </div>
      <input
        ref={photoInputRef}
        id={photoInputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        tabIndex={-1}
        disabled={disabled}
        onChange={onPhotoChange}
        aria-hidden
      />
      <input
        ref={videoInputRef}
        id={videoInputId}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        tabIndex={-1}
        disabled={disabled}
        onChange={onVideoChange}
        aria-hidden
      />
      {fileError && (
        <p
          role="alert"
          className={
            onDark
              ? "rounded-xl bg-brand-950/40 px-3 py-2 text-center text-xs text-brand-100 ring-1 ring-brand-500/20"
              : "rounded-xl bg-brand-50 px-3 py-2 text-center text-xs text-brand-950"
          }
        >
          {fileError}
        </p>
      )}
    </div>
  );
}
