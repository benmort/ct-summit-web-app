"use client";

import { useTenantContent } from "@/components/TenantContentProvider";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onAccept: () => void;
};

const ACKNOWLEDGEMENT_FADE_DURATION_MS = 300;

export default function SummitAcknowledgementOverlay({ open, onAccept }: Props) {
  const { onboarding } = useTenantContent();
  const [visible, setVisible] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const acceptTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      setIsAcknowledging(false);
      return;
    }

    setIsAcknowledging(false);
    const frame = window.requestAnimationFrame(() => {
      setVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    return () => {
      if (acceptTimerRef.current !== null) {
        window.clearTimeout(acceptTimerRef.current);
      }
    };
  }, []);

  const handleAccept = () => {
    if (isAcknowledging) return;
    setIsAcknowledging(true);
    setVisible(false);
    acceptTimerRef.current = window.setTimeout(() => {
      onAccept();
    }, ACKNOWLEDGEMENT_FADE_DURATION_MS);
  };

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[250] flex min-h-dvh items-center justify-center bg-scrim/90 px-4 py-6 backdrop-blur-sm transition-opacity duration-300 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`w-full max-w-2xl rounded-2xl border border-veil/15 bg-surface-950/95 p-6 shadow-2xl transition duration-300 ease-out sm:p-8 ${
          visible ? "translate-y-0 scale-100" : "translate-y-2 scale-[0.98]"
        }`}
      >
        <h2 className="text-balance text-center text-base font-semibold uppercase tracking-[0.16em] text-brand-200 sm:text-lg">
          {onboarding.acknowledgement.title}
        </h2>
        <div className="mt-5 space-y-4 text-base font-bold leading-relaxed text-ink-200 sm:text-lg">
          {onboarding.acknowledgement.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAccept}
          disabled={isAcknowledging}
          className="mt-7 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md bg-brand-500 px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-surface-950 transition hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          Acknowledge and continue
          <ChevronRightIcon className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
