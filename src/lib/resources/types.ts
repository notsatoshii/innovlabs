// Resource library contracts (docs/app/phases/phase-1.md §5.5 and §6).
// JSON files under content/resources/ are the source of truth until the
// backoffice exists (decision D2, option B → C); scripts/seed-resources.ts
// upserts them into public.tools and public.glossary with the service role.

export type Difficulty = 1 | 2 | 3 | 4; // L1 누구나 · L2 설치형 · L3 터미널 · L4 개발자
export type ToolStatus = "taught" | "mentioned" | "reference" | "draft";
export type ToolPath = "browser" | "agent";
export type TrackCode = "DOC" | "RES" | "DAT" | "SAL" | "CON" | "MGT" | "SMB";

export const TOOL_CATEGORIES = [
  "agents",
  "orchestration",
  "research",
  "scraping",
  "memory",
  "knowledge-rag",
  "graphs",
  "programming",
  "mcp",
  "token-optimization",
  "claude",
  "vendor-ai",
  "local-models",
  "documents",
  "browser-automation",
  "workflow-automation",
  "observability-evals",
  "infra",
  "media",
  "korea",
  "benchmarks",
  "learning",
  "security",
] as const;
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

/** Korean labels for the UI. Keys are the library's category slugs. */
export const CATEGORY_LABEL: Record<ToolCategory, string> = {
  agents: "에이전트",
  orchestration: "오케스트레이션",
  research: "리서치",
  scraping: "수집·스크래핑",
  memory: "메모리",
  "knowledge-rag": "지식·RAG",
  graphs: "그래프·다이어그램",
  programming: "코딩 에이전트",
  mcp: "MCP",
  "token-optimization": "토큰·비용 최적화",
  claude: "Claude",
  "vendor-ai": "주요 AI 서비스",
  "local-models": "로컬 모델",
  documents: "문서 처리",
  "browser-automation": "브라우저 자동화",
  "workflow-automation": "워크플로우 자동화",
  "observability-evals": "관측·평가",
  infra: "인프라",
  media: "미디어",
  korea: "한국",
  benchmarks: "벤치마크",
  learning: "학습 자료",
  security: "보안",
};

export const DIFFICULTY_LABEL: Record<Difficulty, { badge: string; who: string }> = {
  1: { badge: "L1 누구나", who: "웹사이트나 앱을 열고 로그인하면 바로 쓸 수 있어요" },
  2: { badge: "L2 설치형", who: "앱을 설치하고 계정을 연결하면 돼요. 터미널은 필요 없어요" },
  3: { badge: "L3 터미널", who: "터미널 명령(복사·붙여넣기 수준)과 API 키가 필요해요" },
  4: { badge: "L4 개발자", who: "코드를 쓰거나 고쳐야 해요" },
};

export const STATUS_LABEL: Record<Exclude<ToolStatus, "draft">, string> = {
  taught: "수업에서 다룸",
  mentioned: "수업에서 소개",
  reference: "참고",
};

/** One row of public.tools; also the shape of content/resources/tools.json entries. */
export interface ToolEntry {
  id: string; // slug, stable
  name: string; // Latin letters for tool names
  url: string | null; // required unless status = 'draft'
  category: ToolCategory;
  tags: string[];
  difficulty: Difficulty;
  status: ToolStatus;
  paths: ToolPath[];
  tracks: TrackCode[]; // empty = every track
  license: string | null;
  cost: string | null; // Korean, e.g. "무료" / "월 $20"
  what_it_is: string; // Korean, one analogy
  use_it_to: string | null; // Korean, one concrete scenario
  why_it_matters: string | null; // Korean
  watch_out: string | null; // Korean, the honest catch
  korean_notes: string | null;
  stars: number | null;
  stars_dated: string | null; // YYYY-MM-DD
  last_verified: string | null; // YYYY-MM-DD
  sort_order: number;
}

/** One row of public.glossary; shape of content/resources/glossary.json entries. */
export interface GlossaryEntry {
  id: string;
  term: string; // Korean display term, e.g. "하네스"
  loanword: string | null; // the Latin original when it should be shown, e.g. "harness"
  analogy: string; // Korean, one everyday analogy
  meaning: string; // Korean, one sentence of what it means for you
  sort_order: number;
}

/** content/resources/stack.json: the dated A3 tool stack, both paths. */
export interface StackRow {
  role: string; // Korean, e.g. "어시스턴트"
  pick: string;
  alternate: string | null;
  why: string; // Korean
  cost: string; // Korean
}
export interface StackData {
  dated: string; // e.g. "2026-09"
  browser: { rows: StackRow[]; minimum: string; recommended: string };
  agent: { rows: StackRow[]; minimum: string; recommended: string; full: string };
  note: string; // Korean: tools change quarterly; plans say "your assistant"
}

/** Track code ↔ app track id (SMB has no app track; it surfaces for full_agent). */
export const TRACK_CODE_BY_ID: Record<string, TrackCode> = {
  docs_admin: "DOC",
  research_planning: "RES",
  data_numbers: "DAT",
  sales_customer: "SAL",
  content_marketing: "CON",
  management_coordination: "MGT",
};
