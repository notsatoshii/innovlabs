"use client";

// 계정 section: edit 표시 이름 · 회사명 · 직함. Same limits as the registration
// details step (fields.ts). Saves through updateProfileFields, which touches
// only the learner-editable columns and logs a profile_updated event.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileFields } from "@/lib/survey/remote";
import {
  COMPANY_NAME_MAX,
  DISPLAY_NAME_MAX,
  JOB_TITLE_MAX,
  normalizeIdentity,
  validateIdentity,
  type IdentityErrors,
} from "./fields";

interface Props {
  displayName: string;
  companyName: string | null;
  jobTitle: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function ProfileEditForm(initial: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [companyName, setCompanyName] = useState(initial.companyName ?? "");
  const [jobTitle, setJobTitle] = useState(initial.jobTitle ?? "");
  const [errors, setErrors] = useState<IdentityErrors>({});
  const [state, setState] = useState<SaveState>("idle");

  const normalized = normalizeIdentity({ displayName, companyName, jobTitle });
  const dirty =
    normalized.displayName !== initial.displayName ||
    normalized.companyName !== (initial.companyName ?? null) ||
    normalized.jobTitle !== (initial.jobTitle ?? null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateIdentity({ displayName, companyName, jobTitle });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setState("saving");
    const result = await updateProfileFields({
      display_name: normalized.displayName,
      company_name: normalized.companyName,
      job_title: normalized.jobTitle,
    });
    if (!result.ok) {
      setState("error");
      return;
    }
    setState("saved");
    // The identity card above is server-rendered; pull the fresh row.
    router.refresh();
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <Field label="표시 이름" required error={errors.displayName}>
        <input
          type="text"
          autoComplete="name"
          maxLength={DISPLAY_NAME_MAX}
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            setState("idle");
          }}
          className="nb-input w-full px-4 py-3 text-[15px]"
        />
      </Field>
      <Field label="회사명" error={errors.companyName}>
        <input
          type="text"
          autoComplete="organization"
          maxLength={COMPANY_NAME_MAX}
          value={companyName}
          onChange={(e) => {
            setCompanyName(e.target.value);
            setState("idle");
          }}
          placeholder="예: 이노랩스"
          className="nb-input w-full px-4 py-3 text-[15px]"
        />
      </Field>
      <Field label="직함" error={errors.jobTitle}>
        <input
          type="text"
          autoComplete="organization-title"
          maxLength={JOB_TITLE_MAX}
          value={jobTitle}
          onChange={(e) => {
            setJobTitle(e.target.value);
            setState("idle");
          }}
          placeholder="예: 마케팅팀 대리"
          className="nb-input w-full px-4 py-3 text-[15px]"
        />
      </Field>
      <div className="mt-1 flex items-center gap-3">
        <button
          type="submit"
          disabled={!dirty || state === "saving"}
          className="nb-btn nb-btn-primary px-5 py-2.5 text-sm"
        >
          {state === "saving" ? "저장 중..." : "저장하기"}
        </button>
        {state === "saved" && (
          <span className="text-sm text-gray-500">저장했어요.</span>
        )}
        {state === "error" && (
          <span className="text-sm text-red-500">
            저장하지 못했어요. 잠시 후 다시 시도해 주세요.
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-gray-800">
        {label}
        {required ? (
          <span className="ml-1 text-[var(--nb-pink-deep)]">*</span>
        ) : (
          <span className="ml-1 text-xs font-medium text-gray-400">선택</span>
        )}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-xs text-red-500">{error}</span>}
    </label>
  );
}
