import SummitEmpty from "@/components/summit/SummitEmpty";
import SummitPageHeader from "@/components/summit/SummitPageHeader";
import SummitScheduleTimeline from "@/components/summit/SummitScheduleTimeline";
import { getSummitContext } from "@/lib/summit/context";
import { getTenantContent } from "@/lib/tenant/content";
import { buildScheduleDays } from "@/lib/summit/schedule";
import { getEventsAll, getScheduleAll, getSpeakersAll } from "@/lib/summit/service";

export default async function SummitSchedulePage() {
  const context = await getSummitContext();
  const { navigation } = await getTenantContent();
  const [schedule, events, speakers] = await Promise.all([
    getScheduleAll(context.selectedSummitName),
    getEventsAll(context.selectedSummitName),
    getSpeakersAll(context.selectedSummitName),
  ]);

  const scheduleDays = buildScheduleDays(schedule, events, speakers);

  if (!scheduleDays.length) {
    return (
      <SummitEmpty
        title="No program available"
        body="Select another summit or check back after content is published."
      />
    );
  }

  return (
    <div className="w-full space-y-5">
      <SummitPageHeader title="Program" subtitle={navigation.pageSubtitles.program} />
      <SummitScheduleTimeline days={scheduleDays} />
    </div>
  );
}
