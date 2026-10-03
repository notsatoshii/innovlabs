// Response shapes of the two Phase 2c staff routes, shared by the routes and
// the client controls that call them. Request shapes are contracts in
// src/lib/courses/types.ts (CountersignRequest, TrackConfirmRequest).

import type { TrackCode } from "@/lib/resources/types";

/** POST /api/staff/learner/[userId]/countersign */
export interface CountersignResult {
  countersign: {
    event_id: number;
    countersigned_at: string;
    baseline_event_id: number;
    /** True when it had already been countersigned (nothing new was written). */
    already: boolean;
  };
}

/** POST /api/staff/learner/[userId]/track */
export interface TrackConfirmResult {
  track_confirmed: {
    event_id: number;
    created_at: string;
    track: TrackCode;
    /** True when the newest confirmation already named this track (nothing new was written). */
    unchanged: boolean;
  };
}
