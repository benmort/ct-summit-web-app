import SummitEmpty from "@/components/summit/SummitEmpty";
import SummitPageHeader from "@/components/summit/SummitPageHeader";
import SummitScheduleTimeline from "@/components/summit/SummitScheduleTimeline";
import { getT } from "@/lib/i18n/server-messages";
import { getSummitContext } from "@/lib/summit/context";
import { getTenantContent } from "@/lib/tenant/content";
import { buildScheduleDays } from "@/lib/summit/schedule";
import {
  getEventsAll,
  getProgramDaysAll,
  getScheduleAll,
  getSpeakersAll,
} from "@/lib/summit/service";
import { getTenantSlug } from "@/lib/tenant/server";

export default async function SummitSchedulePage() {
  const context = await getSummitContext();
  const t = await getT();
  const { navigation } = await getTenantContent();
  const [schedule, events, speakers, programDays, tenantSlug] = await Promise.all([
    getScheduleAll(context.selectedSummitName),
    getEventsAll(context.selectedSummitName),
    getSpeakersAll(context.selectedSummitName),
    getProgramDaysAll(),
    getTenantSlug(),
  ]);

  const scheduleDays = buildScheduleDays(schedule, events, speakers, { programDays, tenantSlug });

  if (!scheduleDays.length) {
    return (
      <SummitEmpty
        title={t("program.emptyTitle")}
        body={t("program.emptyBody")}
      />
    );
  }

  return (
    <div className="w-full space-y-5">
      <SummitPageHeader title={t("program.pageTitle")} subtitle={navigation.pageSubtitles.program} />
      <SummitScheduleTimeline days={scheduleDays} />
    </div>
  );
}
