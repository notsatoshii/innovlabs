import type { TrackId } from "./types";

/**
 * Track display copy (teaser screen — spec: name + one-liner, no LLM).
 * DRAFT copy: not specified in spec; flagged for product review.
 */
export const TRACKS: Record<TrackId, { name: string; oneLiner: string }> = {
  docs_admin: {
    name: "문서·행정 트랙",
    oneLiner: "보고서·기획안 작성과 반복 행정 처리를 AI로 절반 이하로 줄이는 트랙입니다.",
  },
  research_planning: {
    name: "리서치·기획 트랙",
    oneLiner: "자료 조사부터 요약·기획안 초안까지, 리서치 흐름 전체를 AI와 함께 재설계하는 트랙입니다.",
  },
  data_numbers: {
    name: "데이터·수치 트랙",
    oneLiner: "엑셀 정리·취합·분석 업무를 AI로 자동화해 숫자 다루는 시간을 크게 줄이는 트랙입니다.",
  },
  sales_customer: {
    name: "영업·고객 트랙",
    oneLiner: "고객 응대·제안서·팔로업 커뮤니케이션을 AI로 빠르고 일관되게 만드는 트랙입니다.",
  },
  content_marketing: {
    name: "콘텐츠·마케팅 트랙",
    oneLiner: "SNS·상세페이지·카피 제작 과정을 AI 워크플로우로 바꿔 제작 속도를 높이는 트랙입니다.",
  },
  management_coordination: {
    name: "관리·조율 트랙",
    oneLiner: "회의·보고·일정 조율 등 팀을 움직이는 업무를 AI로 가볍게 만드는 트랙입니다.",
  },
};
