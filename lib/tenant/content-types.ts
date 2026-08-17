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

/**
 * An image asset with its true pixel dimensions.
 *
 * next/image needs the real ratio to reserve space; declaring a wrong one does
 * not fail loudly, it just letterboxes the artwork inside the space it reserved.
 */
export type BrandImage = { src: string; width: number; height: number; alt?: string };

export type BrandContent = {
  /** Organisation or event family name, e.g. "Common Threads". */
  name: string;
  /** Wordmark in the app header. May include the year, e.g. "Common Threads Summit '26". */
  wordmark: string;
  /** Legal entity that owns uploaded media. Appears in the upload terms. */
  legalEntity: string;
  /** Browser/social description. */
  description: string;
  /**
   * Standfirst paragraph under the event name on the dashboard.
   *
   * A literal `{title}` is replaced with the summit title — the part after the
   * colon in the summit's `Name`, the same text rendered as the big heading.
   */
  eventBlurb: string;
  /** Colour for the browser chrome and PWA manifest. */
  themeColor: string;
  assets: {
    /**
     * Wordmark on the photo showreel. That footer sits on `scrim`, which stays
     * near-black in every theme, so this wants the reversed or light variant.
     */
    logo: BrandImage;
    /**
     * Logo shown in the app header, replacing the `wordmark` text.
     *
     * Opt-in: omit it and the header keeps rendering the wordmark, which is why
     * the default tenant's header is unchanged. Pick the variant that suits the
     * tenant's theme — the header sits on `surface-950`, which is near-black in
     * dark mode and near-white in light mode.
     */
    headerLogo?: BrandImage;
    /** Full-bleed backdrop behind the acknowledgement and onboarding slides. */
    onboardingBackground: string;
    /** Looping video behind the dashboard hero. */
    heroVideo: string;
    /**
     * Stills that cross-fade in place behind the dashboard hero, in order.
     *
     * Takes precedence over `heroVideo` when non-empty, so a tenant with its own
     * photography does not have to borrow another tenant's video. Omit it and the
     * hero keeps playing `heroVideo`, which is why the default tenant is unchanged.
     */
    heroImages?: string[];
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
    /**
     * Closing statement, rendered on its own with emphasis after `paragraphs`.
     *
     * Older content repeated it inside `paragraphs` because it used to render
     * nowhere else; the overlay skips it when it is already there, so both
     * shapes stay correct.
     */
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
  /**
   * Getting-there hint on venue pages. Null omits the row; an empty `url`
   * renders the value as plain text, for tenants with no single trip planner.
   */
  transport: { label: string; value: string; url: string } | null;
  /** Printable code of conduct behind the download button. Null hides the button. */
  codeOfConductPdfUrl: string | null;
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
