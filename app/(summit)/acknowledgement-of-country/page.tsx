import Link from "next/link";
import { getT } from "@/lib/i18n/server-messages";
import { getTenantContent } from "@/lib/tenant/content";

export default async function Page() {
  const t = await getT();
  const { onboarding } = await getTenantContent();
  return (
    <article className="rounded-xl border border-veil/10 bg-veil/5 p-5 sm:p-6">
      <h1 className="text-xl font-semibold uppercase tracking-[0.12em] text-brand-100 sm:text-2xl">
        {onboarding.acknowledgement.title}
      </h1>
      <div className="mt-4 space-y-4 text-base font-bold leading-relaxed text-ink-200 sm:text-lg">
        {onboarding.acknowledgement.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-10 items-center rounded-md border border-veil/20 bg-veil/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-100 transition hover:bg-veil/10"
      >
        {t("pages.backToHome")}
      </Link>
    </article>
  );
}
