import SummitCodeConductContent from "@/components/summit/SummitCodeConductContent";
import SummitEmpty from "@/components/summit/SummitEmpty";
import { getT } from "@/lib/i18n/server-messages";
import { getSummitContext } from "@/lib/summit/context";
import { fieldString } from "@/lib/summit/fields";
import { getTenantContent } from "@/lib/tenant/content";
import { getCodeConductStatic } from "@/lib/summit/service";

export default async function Page() {
  const t = await getT();
  const context = await getSummitContext();
  const { navigation, integrations } = await getTenantContent();
  const content = await getCodeConductStatic(context.selectedSummitName);
  if (!content) {
    return (
      <SummitEmpty
        title={t("pages.codeConductUnavailableTitle")}
        body={t("pages.codeConductUnavailableBody")}
      />
    );
  }

  const contentBody = fieldString(content, "Content Body");
  if (!contentBody) {
    return (
      <SummitEmpty
        title={t("pages.codeConductUnavailableTitle")}
        body={t("pages.codeConductUnavailableBody")}
      />
    );
  }

  return (
    <SummitCodeConductContent
      title={t("pages.codeConductTitle")}
      pageSubtitle={navigation.pageSubtitles.codeConduct}
      contentBody={contentBody}
      supportEmail={integrations.supportEmail}
      pdfUrl={integrations.codeOfConductPdfUrl}
    />
  );
}
