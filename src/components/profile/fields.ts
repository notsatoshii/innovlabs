// Identity fields shared by the registration `details` step and the profile
// edit form: one set of limits, one set of messages (phase-1.md D1).

export const DISPLAY_NAME_MAX = 40;
export const COMPANY_NAME_MAX = 60;
export const JOB_TITLE_MAX = 60;

export interface IdentityInput {
  displayName: string;
  companyName: string;
  jobTitle: string;
}

export type IdentityErrors = Partial<Record<keyof IdentityInput, string>>;

/** Trimmed values; optional fields become null when empty. */
export function normalizeIdentity(input: IdentityInput): {
  displayName: string;
  companyName: string | null;
  jobTitle: string | null;
} {
  return {
    displayName: input.displayName.trim(),
    companyName: input.companyName.trim() || null,
    jobTitle: input.jobTitle.trim() || null,
  };
}

/** Empty object means valid. Messages are shown under the field. */
export function validateIdentity(input: IdentityInput): IdentityErrors {
  const errors: IdentityErrors = {};
  const name = input.displayName.trim();
  if (!name) errors.displayName = "표시 이름을 입력해 주세요.";
  else if (name.length > DISPLAY_NAME_MAX)
    errors.displayName = `표시 이름은 ${DISPLAY_NAME_MAX}자 이내로 적어 주세요.`;
  if (input.companyName.trim().length > COMPANY_NAME_MAX)
    errors.companyName = `회사명은 ${COMPANY_NAME_MAX}자 이내로 적어 주세요.`;
  if (input.jobTitle.trim().length > JOB_TITLE_MAX)
    errors.jobTitle = `직함은 ${JOB_TITLE_MAX}자 이내로 적어 주세요.`;
  return errors;
}
