"use client";

// Student / job-seeker waitlist stub (spec: 3 screens until the full survey is built).

import { StubFlow } from "@/components/survey/StubFlow";

export default function StudentPage() {
  return (
    <StubFlow
      path="student"
      waitlistMessage="학생과 취업 준비생을 위한 맞춤 진단을 준비 중입니다. 오픈 시 가장 먼저 알려드릴게요."
      screens={[
        {
          field: "student_status",
          title: "현재 상황에 가까운 것은?",
          options: [
            { id: "enrolled", label: "대학 재학 중" },
            { id: "job_seeking", label: "졸업 예정 · 취업 준비" },
            { id: "career_change", label: "이직 준비" },
            { id: "other", label: "기타" },
          ],
        },
        {
          field: "student_goal",
          title: "AI 역량을 어디에 쓰고 싶으세요?",
          options: [
            { id: "employment", label: "취업 경쟁력" },
            { id: "academics", label: "학업 · 과제 효율" },
            { id: "side_project", label: "부업 · 사이드 프로젝트" },
            { id: "exploring", label: "아직 탐색 중" },
          ],
        },
      ]}
    />
  );
}
