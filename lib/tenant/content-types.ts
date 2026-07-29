/**
 * Shapes of the per-tenant content documents in tenants/<slug>/content/.
 *
 * One file per concern, matching the sections of docs/tenant-questionnaire.md so
 * a content creator's answers transcribe straight into JSON.
 *
 * These types are shared by server and client code — the content is loaded on
 * the server and handed to client components through TenantContentProvider,
 * because a client component cannot resolve the tenant from request headers.
 */

export type BrandContent = {
  /** Organisation or event family name, e.g. "Common Threads". */
  name: string;
  /** Wordmark in the app header. May include the year, e.g. "Common Threads Summit '26". */
  wordmark: string;
  /** Legal entity that owns uploaded media. Appears in the upload terms. */
  legalEntity: string;
  /** Browser/social description. */
  description: string;
  /** Colour for the browser chrome and PWA manifest. */
  themeColor: string;
  assets: {
    logo: string;
    onboardingBackground: string;
    heroVideo: string;
    appleTouchIcon: string;
    favicon: string;
    faviconPng: { url: string; sizes: string }[];
    androidChrome: { url: string; sizes: string }[];
  };
};

export type NavTab = { href: string; label: string };
export type NavMenuItem = { href: string; label: string; subtitle: string };

export type NavigationContent = {
  /** Bottom tab bar, in order. */
  tabs: NavTab[];
  /** Full slide-out menu, in order. */
  menu: NavMenuItem[];
  /** Page header taglines, keyed by page. */
  pageSubtitles: Record<string, string>;
};

export type OnboardingSlide = {
  eyebrow: string;
  heading: string;
  paragraphs: string[];
};

export type OnboardingContent = {
  acknowledgement: {
    title: string;
    /** Shown on its own as the closing statement. Must also appear in `paragraphs`. */
    sovereigntyStatement: string;
    paragraphs: string[];
    acceptLabel: string;
  };
  slides: OnboardingSlide[];
  homescreenPrompt: {
    title: string;
    body: string;
    androidBody: string;
    iosSteps: string[];
    fallbackBody: string;
  };
};

export type GuidanceSection = { title: string; paragraphs: string[] };

export type GuidanceContent = {
  /** Page heading, e.g. "Event Guidance". */
  title: string;
  sections: GuidanceSection[];
};

export type IntegrationsContent = {
  /** Contact address surfaced in guidance and code-of-conduct copy, and auto-linked. */
  supportEmail: string;
  /** Group-chat invite behind the header button. Null hides the button. */
  communityChatUrl: string | null;
  /** Public transport hint on venue pages. Null omits the row. */
  transport: { label: string; value: string; url: string } | null;
  /** Maps a whatsappChannels record id to a Flaticon class for its list icon. */
  channelIcons: Record<string, string>;
};

export type TenantContent = {
  brand: BrandContent;
  navigation: NavigationContent;
  onboarding: OnboardingContent;
  guidance: GuidanceContent;
  integrations: IntegrationsContent;
};
