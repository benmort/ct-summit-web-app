import SummitEmpty from "@/components/summit/SummitEmpty";
import SummitListCard from "@/components/summit/SummitListCard";
import SummitPageHeader from "@/components/summit/SummitPageHeader";
import { getT } from "@/lib/i18n/server-messages";
import { getSummitContext } from "@/lib/summit/context";
import { fieldString } from "@/lib/summit/fields";
import { getTenantContent } from "@/lib/tenant/content";
import { getSurveysStatic } from "@/lib/summit/service";

export default async function Page() {
  const t = await getT();
  const context = await getSummitContext();
  const { navigation } = await getTenantContent();
  const surveys = await getSurveysStatic(context.selectedSummitName);

  if (!surveys.length) {
    return <SummitEmpty title={t("pages.surveysEmptyTitle")} body={t("pages.surveysEmptyBody")} />;
  }

  return (
    <div className="space-y-4">
      <SummitPageHeader title={t("pages.surveysTitle")} subtitle={navigation.pageSubtitles.surveys} />
      <div className="grid gap-3 sm:grid-cols-2">
        {surveys.map((survey) => (
          <SummitListCard
            key={survey.id}
            href={`/surveys/${survey.id}`}
            item={{
              id: survey.id,
              title: fieldString(survey, "Name") || t("pages.surveyFallbackName"),
              subtitle: fieldString(survey, "Description"),
              description: null,
              imageUrl: "/images/surveys/survey-feedback.svg",
              tags: [],
            }}
          />
        ))}
      </div>
    </div>
  );
}
