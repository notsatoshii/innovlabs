// Input limits shared by the staff forms (client) and the /api/staff routes
// (server). Kept out of the "use client" files so the routes import real
// numbers, not client references.

export const COHORT_NAME_MAX = 60;
/** schedule_note and venue. */
export const COHORT_NOTE_MAX = 80;
export const NOTE_MAX = 2000;
export const EMAIL_MAX = 254;
