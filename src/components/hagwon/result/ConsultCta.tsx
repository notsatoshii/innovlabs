"use client";

// 30분 진단 상담 CTA under the 학원 result (phase-hagwon.md H6). One click
// POSTs /api/inquiry/consult, which recomputes the module summary from the
// profile on the server, writes the inquiry row and the consult_requested
// event with the service role, and allows one request per account. The
// browser sends only an optional contact address (accounts without an email).

import { useEffect, useState } from "react";
import { RESULT_COPY } from "@/lib/hagwon/modules";

const DONE_KEY_PREFIX = "hagwon_consult_requested_v1:";

interface Props {
  userId: string;
  /** Account email; empty for a Kakao account without the email scope. */
  email: string;
  /** A consult_requested event already exists for this user (server check). */
  alreadyRequested: boolean;
}

type State = "idle" | "sending" | "done" | "error";

export default function ConsultCta({ userId, email, alreadyRequested }: Props) {
  const [state, setState] = useState<State>(alreadyRequested ? "done" : "idle");
  // Contact address typed by the 원장 when the account has no email.
  const [contact, setContact] = useState("");
  const needsContact = email.trim() === "";
  const contactOk = !needsContact || contact.trim().length >= 5;
  const DONE_KEY = DONE_KEY_PREFIX + userId;

  // A request sent earlier in this browser session stays "done".
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      if (sessionStorage.getItem(DONE_KEY) === "1") setState("done");
    } catch {
      // storage blocked: stay idle
    }
  }, [DONE_KEY]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const request = async () => {
    setState("sending");
    try {
      const res = await fetch("/api/inquiry/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ contact: needsContact ? contact.trim() : undefined }),
      });
      const json = (await res.json()) as { ok: boolean };
      if (!json.ok) {
        setState("error");
        return;
      }
    } catch {
      setState("error");
      return;
    }
    try {
      sessionStorage.setItem(DONE_KEY, "1");
    } catch {
      // non-fatal: the server still refuses a second request
    }
    setState("done");
  };

  if (state === "done") {
    return (
      <div className="nb-card px-5 py-6 text-center">
        <p className="mb-1 text-[15px] font-bold">신청을 받았습니다.</p>
        <p className="text-sm text-gray-500">확인 후 연락드리겠습니다.</p>
      </div>
    );
  }

  return (
    <div>
      {needsContact && (
        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-bold">연락받을 이메일 또는 전화번호</span>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="예: 010-1234-5678"
            maxLength={80}
            className="nb-input w-full px-4 py-3 text-base"
          />
          <span className="mt-1 block text-xs text-gray-500">
            계정에 이메일이 없어 연락처를 따로 받습니다. 상담 안내에만 씁니다.
          </span>
        </label>
      )}
      <button
        type="button"
        disabled={state === "sending" || !contactOk}
        onClick={request}
        className="nb-btn nb-btn-primary w-full py-4 text-[15px]"
      >
        {state === "sending" ? "신청 중…" : RESULT_COPY.cta}
      </button>
      {state === "error" && (
        <p className="mt-2 text-sm text-red-500">
          신청을 보내지 못했습니다. 잠시 후 다시 시도해 주시기 바랍니다.
        </p>
      )}
    </div>
  );
}
