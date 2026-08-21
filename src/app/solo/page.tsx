"use client";

// Solopreneur waitlist stub (spec: 3 screens until the full survey is built).

import { StubFlow } from "@/components/survey/StubFlow";

export default function SoloPage() {
  return (
    <StubFlow
      path="solo"
      audience="1인 사업자"
      waitlistMessage="1인 사업자를 위한 맞춤 진단을 준비 중입니다. 오픈 시 가장 먼저 알려드릴게요."
      screens={[
        {
          field: "business_type",
          title: "어떤 일을 하고 계신가요?",
          options: [
            { id: "ecommerce", label: "온라인 판매 · 이커머스" },
            { id: "offline_store", label: "오프라인 매장 (카페 · 식당 · 리테일)" },
            { id: "creator", label: "콘텐츠 · 크리에이터" },
            { id: "freelance_professional", label: "디자인 · 개발 등 프리랜스 전문직" },
            { id: "education_coaching", label: "교육 · 강의 · 코칭" },
            { id: "consulting_agency", label: "컨설팅 · 에이전시" },
            { id: "other", label: "기타" },
          ],
        },
        {
          field: "solo_priority",
          title: "가장 먼저 자동화하고 싶은 일은?",
          options: [
            { id: "marketing_content", label: "마케팅 · SNS · 콘텐츠" },
            { id: "customer_service", label: "고객 응대 · CS" },
            { id: "admin_tax", label: "정산 · 세무 · 행정" },
            { id: "product_planning", label: "상품 · 서비스 기획" },
            { id: "research", label: "리서치 · 시장 조사" },
            { id: "everything", label: "전부 다" },
          ],
        },
      ]}
    />
  );
}
