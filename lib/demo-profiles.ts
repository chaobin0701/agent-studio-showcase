import { canonicalDemoSlug, findDemo } from "./catalog";
import { profiles, months } from "./robot/service";
import { contosoProfiles } from "./contoso/localization";

export function profilesForDemo(slug: string) {
  return canonicalDemoSlug(slug) === "contoso-outdoor"
    ? contosoProfiles
    : profiles;
}
export function periodsForDemo(slug: string): readonly string[] {
  return canonicalDemoSlug(slug) === "contoso-outdoor" ? ["2023"] : months;
}
export function profileForDemo(slug: string, persona: string) {
  return profilesForDemo(slug).find((p) => p.id === persona);
}
export function validDemoContext(
  slug: string,
  persona: string,
  period: string,
) {
  return (
    Boolean(findDemo(slug)) &&
    Boolean(profileForDemo(slug, persona)) &&
    periodsForDemo(slug).includes(period)
  );
}
