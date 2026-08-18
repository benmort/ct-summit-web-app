"use client";

import { Dialog } from "@headlessui/react";
import { useState } from "react";

import { useT } from "@/components/MessagesProvider";
import { useTenantContent } from "@/components/TenantContentProvider";

type Props = {
  variant?: "onDark" | "default";
};

export default function UploadTermsNotice({ variant = "default" }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  // The assignment names a legal entity, so it has to be the tenant's own —
  // these terms are what a delegate agrees to when they upload a photo.
  const { legalEntity } = useTenantContent().brand;

  const muted =
    variant === "onDark" ? "text-ink-50/55" : "text-ink-600";
  const link =
    variant === "onDark"
      ? "font-medium text-brand-300 underline decoration-brand-300/50 underline-offset-2 hover:text-brand-200 hover:decoration-brand-200"
      : "font-medium text-brand-800 underline decoration-brand-800/40 underline-offset-2 hover:text-brand-900";

  // Split around the placeholder rather than gluing two half-sentences together,
  // so a translation can put the link wherever its grammar wants it.
  const [agreeBefore, agreeAfter = ""] = t("moments.termsAgree").split("{terms}");
  const [assignBefore, assignAfter = ""] = t("moments.termsAssignment").split("{entity}");

  return (
    <>
      <p className={`text-center text-xs leading-snug ${muted}`}>
        {agreeBefore}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={link}
        >
          {t("moments.termsLink")}
        </button>
        {agreeAfter}
      </p>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="relative z-[200]"
      >
        <Dialog.Overlay className="fixed inset-0 bg-scrim/60 backdrop-blur-sm" />
        <div className="fixed inset-0 overflow-y-auto overflow-x-hidden">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <Dialog.Panel className="flex w-full max-w-lg flex-col rounded-2xl bg-panel p-4 text-on-panel shadow-xl ring-1 ring-scrim/5 sm:max-h-[min(85vh,32rem)] sm:overflow-y-auto sm:p-6">
              <Dialog.Title className="text-balance text-sm font-semibold leading-snug text-on-panel sm:text-lg sm:leading-normal">
                {t("moments.termsTitle")}
              </Dialog.Title>
              <div className="mt-3 space-y-2 text-xs leading-snug text-ink-700 sm:mt-4 sm:space-y-3 sm:text-sm sm:leading-relaxed">
                <p>
                  {assignBefore}
                  <strong>{legalEntity}</strong>
                  {assignAfter}
                </p>
                <p>{t("moments.termsUse", { entity: legalEntity })}</p>
                <p>{t("moments.termsWarranty")}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-4 w-full shrink-0 rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold text-ink-50 transition hover:bg-ink-800 sm:mt-6 sm:py-2.5 sm:text-sm"
              >
                {t("moments.close")}
              </button>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
