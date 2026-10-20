// The course coach (rulebook §3.11). Content was written with a "[코치]"
// placeholder before the coach had a name; the UI shows COACH_NAME instead at
// render time, so content files never need rewriting.

export const COACH_NAME = "모아";

const PLACEHOLDER = /\[코치\]/g;

/** Content text with every "[코치]" placeholder shown as the coach's name. */
export function withCoachName(text: string): string {
  return text.includes("[코치]") ? text.replace(PLACEHOLDER, COACH_NAME) : text;
}
