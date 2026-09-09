import type { TrackId } from "./types";

/**
 * Track display copy (teaser screen — spec: name + one-liner, no LLM).
 * DRAFT copy: not specified in spec; flagged for product review.
 * One-liners say what the track teaches, never a fixed outcome (CLAUDE.md rule 4).
 */
export const TRACKS: Record<TrackId, { name: string; oneLiner: string }> = {
  docs_admin: {
    name: "문서·행정 트랙",
    oneLiner: "보고서·기획안 초안과 결재·정산 같은 반복 행정을 AI에 맡기는 법을 배웁니다.",
  },
  research_planning: {
    name: "리서치·기획 트랙",
    oneLiner: "자료 조사부터 요약, 기획안 초안까지 리서치 흐름을 AI와 함께 다시 짭니다.",
  },
  data_numbers: {
    name: "데이터·수치 트랙",
    oneLiner: "엑셀 취합·정리·분석을 AI로 자동화해 숫자 만지는 시간을 줄이는 법을 익힙니다.",
  },
  sales_customer: {
    name: "영업·고객 트랙",
    oneLiner: "고객 응대, 제안서, 후속 연락을 AI로 빠르고 한결같이 처리하는 법을 익힙니다.",
  },
  content_marketing: {
    name: "콘텐츠·마케팅 트랙",
    oneLiner: "SNS·상세페이지·카피 제작을 AI 워크플로우로 바꿔 제작 속도를 끌어올립니다.",
  },
  management_coordination: {
    name: "관리·조율 트랙",
    oneLiner: "회의, 보고, 일정 조율처럼 팀을 움직이는 일을 AI로 가볍게 만듭니다.",
  },
};
