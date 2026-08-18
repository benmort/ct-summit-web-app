import { cookies } from "next/headers";

import SummitDashboardOnboardingGate from "@/components/summit/SummitDashboardOnboardingGate";
import SummitDashboardPage from "@/components/summit/SummitDashboardPage";
import { onboardingStageFrom } from "@/lib/summit/acknowledgement";
import { suggestedLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  // Resolving the stage here rather than in a mount effect is what gets the
  // dashboard into the server-rendered HTML for a returning delegate.
  const [jar, suggested] = await Promise.all([cookies(), suggestedLocale()]);
  const initialStage = onboardingStageFrom((name) => jar.has(name));

  return (
    <SummitDashboardOnboardingGate initialStage={initialStage} suggestedLocale={suggested}>
      <SummitDashboardPage />
    </SummitDashboardOnboardingGate>
  );
}
