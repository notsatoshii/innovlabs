// Contract of POST /api/register, shared by the route and its thin client
// (seedProfile in src/lib/survey/remote.ts). Types and constants only: safe
// to import from client and server code.

import type { Path, TrackId } from "@/lib/survey/types";

// Bumped 2026-09 (Phase 1a): the consent text now names the identity fields
// and staff access to learning data (docs/app/phases/phase-1.md §5.3).
export const CONSENT_VERSION = "2026-09-v2";

/** What the respondent picked on the teaser when the top two tracks were close. */
export interface TrackChoice {
  track: TrackId;
  via: "user_choice" | "skip_default";
}

export interface RegisterRequest {
  /**
   * Id of the immutable survey_response row. Required for a fresh account;
   * ignored when the account already has a profile. The server reads the row
   * itself: answers, scoring, path and org_code are never taken from here.
   */
  survey_response_id: string | null;
  display_name: string;
  company_name: string | null;
  job_title: string | null;
  /** The required box on the consent screen. Anything but `true` is refused. */
  privacy_consent: boolean;
  marketing_consent: boolean;
  /**
   * Only used when the server's own scoring says "choice": the track must be
   * one of the two the scoring offers (user_choice), otherwise the spec
   * default 문서·행정 is assigned (skip_default).
   */
  track_choice: TrackChoice | null;
}

export interface RegisterData {
  /** true = a new profile row was written; false = identity fields updated. */
  created: boolean;
  path: Path;
}

/** Machine codes in ApiError.error. */
export type RegisterErrorCode =
  | "origin_not_allowed"
  | "unsupported_media_type"
  | "not_authenticated"
  | "rate_limited"
  | "bad_json"
  | "too_large"
  | "display_name_required"
  | "validation"
  | "consent_required"
  | "not_configured"
  | "response_required"
  | "response_not_found"
  | "response_claimed"
  | "invalid_response"
  | "store_failed";
