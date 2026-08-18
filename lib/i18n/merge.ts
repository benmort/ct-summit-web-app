/**
 * Lays a translation overlay over the English source.
 *
 * Overlays are deliberately allowed to be partial: a language that has only had
 * its guidance translated still gets English everywhere else rather than a hole.
 * Arrays replace wholesale rather than merging element-by-element, because the
 * ordered lists here — slides, guidance sections, nav items — only make sense as
 * a complete set, and a half-translated array would interleave two languages.
 */
export function overlayTranslations<T>(source: T, overlay: unknown): T {
  if (overlay === undefined || overlay === null) return source;

  if (Array.isArray(source)) {
    return (Array.isArray(overlay) ? overlay : source) as T;
  }

  if (isPlainObject(source)) {
    if (!isPlainObject(overlay)) return source;
    const merged: Record<string, unknown> = { ...source };
    for (const [key, value] of Object.entries(overlay)) {
      merged[key] = key in source ? overlayTranslations(source[key], value) : value;
    }
    return merged as T;
  }

  // Leaf: take the translation when there is one, keep English when there is not.
  return (typeof overlay === typeof source ? overlay : source) as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
