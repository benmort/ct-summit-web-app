import { Suspense } from "react";
import { getTenantIdentity } from "@/lib/tenant/server";
import { tenantStorage } from "@/lib/tenant/types";
import HomePage from "@/components/HomePage";
import SummitPageHeader from "@/components/summit/SummitPageHeader";
import SummitShell from "@/components/summit/SummitShell";
import { getTenantContent } from "@/lib/tenant/content";
import { getWhatsappChannelsStatic } from "@/lib/summit/service";

function HomeFallback() {
  return (
    <div className="px-4 py-6 text-center text-sm text-ink-400">
      Loading…
    </div>
  );
}

export default async function MomentsPage() {
  const whatsappChannels = await getWhatsappChannelsStatic();
  const { navigation } = await getTenantContent();
  const { moderationEnvPrefix } = tenantStorage(await getTenantIdentity());

  return (
    <SummitShell whatsappChannels={whatsappChannels}>
      <div className="mb-5 w-full">
        <SummitPageHeader title="Moments" subtitle={navigation.pageSubtitles.moments} />
      </div>
      <Suspense fallback={<HomeFallback />}>
        <HomePage mode="gallery" moderationEnvPrefix={moderationEnvPrefix} />
      </Suspense>
    </SummitShell>
  );
}
