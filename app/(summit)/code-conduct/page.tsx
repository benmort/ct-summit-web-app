import SummitCodeConductContent from "@/components/summit/SummitCodeConductContent";
import SummitEmpty from "@/components/summit/SummitEmpty";
import { getSummitContext } from "@/lib/summit/context";
import { fieldString } from "@/lib/summit/fields";
import { getTenantContent } from "@/lib/tenant/content";
import { getCodeConductStatic } from "@/lib/summit/service";

export default async function Page() {
  const context = await getSummitContext();
  const { navigation, integrations } = await getTenantContent();
  const content = await getCodeConductStatic(context.selectedSummitName);
  if (!content) {
    return <SummitEmpty title="Code of conduct unavailable" body="No policy content found for this summit." />;
  }

  const contentBody = fieldString(content, "Content Body");
  if (!contentBody) {
    return <SummitEmpty title="Code of conduct unavailable" body="No policy content found for this summit." />;
  }

  return (
    <SummitCodeConductContent
      title="Code of Conduct"
      pageSubtitle={navigation.pageSubtitles.codeConduct}
      contentBody={contentBody}
      supportEmail={integrations.supportEmail}
      pdfUrl={integrations.codeOfConductPdfUrl}
    />
  );
}
