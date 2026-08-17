export type SummitFields = Record<string, unknown>;

export type SummitRecord = {
  id: string;
  fields: SummitFields;
};

export type SummitListDomain =
  | "speakers"
  | "events"
  | "venues"
  | "crew"
  | "attractions"
  | "organisations"
  | "sponsors";

export type DetailSection = {
  label: string;
  value: string;
  href?: string;
};

export type ListItemView = {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  tags?: string[];
  hasPhone?: boolean;
};

export type DetailView = {
  id: string;
  title: string;
  subtitle?: string | null;
  secondSubtitle?: string | null;
  imageUrl?: string | null;
  tags?: string[];
  sections: DetailSection[];
  body?: string | null;
  /**
   * Heading above `body`. Defaults to "Bio", which is right for a person and
   * wrong for a venue, an attraction or a sponsor — those set their own.
   */
  bodyHeading?: string;
  summary?: string | null;
  videoUrl?: string | null;
};
