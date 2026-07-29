import { timingSafeEqual } from "crypto";

/**
 * Constant-time comparison for shared secrets and bearer tokens.
 * Length mismatch short-circuits: the length of a configured secret is not itself sensitive.
 * Node crypto only — not usable from Edge middleware.
 */
export function secretEquals(actual: string | null | undefined, expected: string): boolean {
  if (!actual || !expected) return false;
  const a = Buffer.from(actual, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
