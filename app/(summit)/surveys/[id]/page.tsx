import { notFound } from "next/navigation";
import { getSummitContext } from "@/lib/summit/context";
import { fieldString } from "@/lib/summit/fields";
import { getSurveysStatic } from "@/lib/summit/service";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  const context = await getSummitContext();
  const surveys = await getSurveysStatic(context.selectedSummitName);
  const survey = surveys.find((item) => item.id === id);
  if (!survey) notFound();

  const url = fieldString(survey, "Url");
  if (!url) {
    return (
      <div className="rounded-xl border border-veil/10 bg-veil/5 p-5 text-sm text-ink-300">
        This survey does not include a URL.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-0 flex-col gap-3">
      <h1 className="text-xl font-semibold text-ink-50">{fieldString(survey, "Name") || "Survey"}</h1>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-veil/10 bg-ink-100">
        <iframe
          title={fieldString(survey, "Name") || "Survey"}
          src={url}
          className="h-full w-full"
          sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}
