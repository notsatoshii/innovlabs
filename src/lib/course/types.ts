// Online course contracts (docs/app/phases/phase-online.md, sub-phase O1).
// MissionContent is the JSON stored in public.course_content.data. It is
// written in the private curriculum repo (curriculum/online/content/) and
// seeded by scripts/course/seed-content.ts, which validates it with
// validateMission() in ./validate.ts. Rows mirror migration 0012. API
// payloads are what /api/course/* accept and return. Import from here;
// never redefine.

// --- Vocabulary -------------------------------------------------------------

/** The six beats, in order (game design §1). 'reward' is rendered by the app. */
export type Beat = "상황" | "알기" | "해보기" | "내 업무에" | "확인" | "보상";

/** XP parts. A part is the beat label, except bosses, which name their steps. */
export type XpPart = string; // 1–20 chars, e.g. "예측", "알기", "해보기", "1라운드"

export type Kind = "p" | "j"; // 처리 | 판단
export type SortAnswer = Kind | "mix";

/** Placeholders the server resolves before a screen reaches the browser. */
export type SlotKey =
  | "q8" // the learner's recurring task (survey Q8), or the pack task
  | "report_name" // S2 industry variant of the Monday report
  | "track_name"
  | "reader_title" // 팀장님 / 부장님 / 임원 by Q3/Q4
  | "candidate1" // Work Map candidate #1 task
  | "candidate2" // Work Map candidate #2 task (B1 "후보 2번으로 바꾸기")
  | "p_hours"
  | "j_hours"
  | "row_count"
  | "p_count"; // Work Map rows marked 처리 (M1.5 gut pick)

/** Slots the mission player fills on the reward screen only (MissionContent.saved). */
export type RewardSlotKey =
  | "seed_count" // M1.1: seed rows saved
  | "total_hours" // the Work Map's hours, every row
  | "candidate_scores" // M1.5: "1번 '…' 13점 · 2번 '…' 12점 · …"
  | "diff_count" // B1: differences on the comparison sheet
  | "drill_task" // B1: what the boss ran on (the sheet's task)
  | "gut_pick"; // M1.5: the row picked by feel, with its score ("" without a pick: the line is dropped)

// --- Content ----------------------------------------------------------------

export interface MissionContent {
  version: 1;
  /** The level's title and goal, on any one mission of the level (the level map reads them). */
  levelTitle?: string;
  levelGoal?: string;
  id: string; // "M1.1", "B1", "S1" (skip test)
  course: "spine0" | "spine2" | "DOC" | "RES" | "DAT" | "SAL" | "CON" | "MGT" | "SMB";
  level: number; // 1–12
  ord: number; // order inside the level, 1-based; the boss is last
  title: string;
  minutes: number;
  boss?: boolean;
  /** Skip test missions are not on the path; they credit other missions. */
  kind?: "mission" | "skip_test";
  /** Max XP per part. The mission total is the sum of the caps. */
  caps: Record<XpPart, number>;
  /** Missions that must be done first (default: the previous one by ord). */
  requires?: string[];
  /** Badges this mission awards on reaching the reward screen. */
  badges?: { id: string; label: string; sub?: string; tool?: boolean }[];
  /** Coach line on the reward screen ([코치] placeholder name in the UI). */
  coach: string;
  /** Next mission title shown on the reward screen. */
  nextTitle?: string;
  /** What the mission saved, shown first on the reward screen, above the XP.
   *  Takes the {{slots}} and the reward-only slots (RewardSlotKey). */
  saved?: string[];
  /** The XP unit on the reward's big number, e.g. "XP(경험치)" where XP is glossed once (M1.1). Default "XP". */
  xpLabel?: string;
  /** A plain-text export offered under the saved lines ([텍스트로 복사]). */
  export?: "work_map" | "round2_card" | "drill_sheet";
  screens: Screen[];
}

export interface Screen {
  id: string; // "s1" … unique in the mission
  beat: Beat;
  /** Skipped when the learner passed the level's skip test. */
  skippable?: boolean;
  media?: Media;
  blocks: Block[];
  /** Label of the primary button. Defaults to 다음. The button stays disabled
   *  until every interaction on the screen reports done. */
  next?: string;
}

export interface Media {
  kind: "motion" | "video" | "screenshot";
  seconds?: number;
  /** Production note for the media team (often English). Never sent to the
   *  browser: forBrowser() in content.ts removes it. */
  brief?: string;
  /** Korean alt text for the produced asset (screen readers). */
  alt?: string;
  /** Asset URL once produced; absent in O1. Without it nothing is shown. */
  src?: string;
}

/** A block shown only when the condition holds for this learner (resolved on the server).
 *  track_dat / track_sal: the learner's track (staff-confirmed wins over the survey's). */
export type BlockWhen = "q8_ok" | "q8_short" | "track_dat" | "track_sal";

/**
 * A block or an I7 option shown only once an I7 of the same mission was
 * answered with one of `in` (resolved in the browser from the learner's
 * choices; B1's data check by account). Nothing inside a conditional block
 * may be required for `done` (validateMission checks it).
 */
export interface ChoiceIf {
  choice: string; // the I7's interaction id
  in: string[];
}

/** Text blocks accept **bold**, line breaks and {{slot}} placeholders only.
 *  Any block may carry `when`; the server drops it when the condition fails.
 *  `if` is decided in the browser (ChoiceIf). */
export type Block = (
  | { t: "h"; text: string } // screen heading
  | { t: "p"; text: string }
  | { t: "quote"; text: string }
  | { t: "warn"; text: string } // warnings come before the action they guard
  | { t: "small"; text: string }
  | { t: "doc"; label?: string; text: string; packId?: string } // read-only pack document
  | { t: "fallback"; label: string; blocks: Block[] } // text instead of missing media
  | { t: "reveal"; label: string; text: string } // tap to show (a recall prompt's answer)
  | { t: "coach"; text: string } // a line in the coach's voice (speech bubble)
  | { t: "bar"; guess?: BarGuess } // the learner's 처리 / 판단 hours as one bar (M1.4 합계)
  | ({ t: "tool" } & ToolCard) // a dated tool card (rulebook §3.6; product names only here)
  | { t: "i"; i: Interaction }
) & { when?: BlockWhen; if?: ChoiceIf };

/**
 * A dated tool card (rulebook §3.6, practical-results-map §4.2): the course
 * word, the rule it carries, and the dated picks. Mission text says
 * "어시스턴트"; product names may appear only in `picks` (validateMission
 * enforces it). Every fact comes from the dated facts files; `asof` is the
 * day they were read and is shown on the card. A card pays no XP.
 */
export interface ToolCard {
  name: string; // the course word, e.g. "회사 어시스턴트"
  asof: string; // YYYY-MM-DD, the facts' read date
  rule: string; // the card's data line, e.g. "회사 계정이면 회사 규칙을 따라요."
  lines: string[]; // what to do first
  picksLabel?: string; // heading over the picks
  picks: { name: string; fact: string }[];
  dont: string; // what never goes in
}

/** A marker on the 처리 / 판단 bar: a guess an I6 kept in this browser (I6 `keep`),
 *  placed at the 판단 share `share` gives for the kept value. */
export interface BarGuess {
  key: string;
  label: string;
  share: Record<string, number>; // option value -> 판단 share, 0–1
}

/** XP rule for a single-answer item. `wrong` defaults to 0. */
export interface ItemXp {
  part: XpPart;
  right: number;
  wrong?: number;
}

export type Interaction =
  | I1Sort
  | I2Pick
  | I3Spot
  | I4Score
  | I6Predict
  | I7Choose
  | I8Timer
  | I9MyTask
  | I10Checklist
  | I11AssistantLab
  | ITerms
  | ISeam;

interface IBase {
  id: string; // unique in the mission, e.g. "s4.sort"
}

/** I6: predict, then reveal. Any answer reveals; the right one pays. */
export interface I6Predict extends IBase {
  type: "I6";
  options: { v: string; label: string }[];
  answer: string;
  xp: ItemXp;
  reveal: string;
  revealRight?: string;
  revealWrong?: string;
  source?: string; // shown on tap (P12)
  /** Keeps the picked value in this browser under this key, for a later mission's bar marker. */
  keep?: string;
}

/** I7: choose. `answer` absent = no right answer (a judgment call that only branches).
 *  `from` lists the learner's own rows instead of (or over) the options:
 *  "seed_rows" = the M1.1 seed rows, option k answering as options[k];
 *  "work_map_rows" = every row of the work map (no answer, no xp, options
 *  empty); after the pick `fromLine` is shown with {kind} = 처리로/판단으로,
 *  with 맞아요 / 바꾸기 (바꾸기 flips that row between 처리 and 판단). With
 *  `xp`, "work_map_rows" pays on that 맞아요 / 바꾸기 tap (answer "ok" or
 *  "flip", the row's mark saved), never on the row pick (XP on evidence).
 *  "p_rows" = the work map rows marked 처리 (no answer, no xp, options
 *  empty): a pick by feel that only branches, kept like any branch choice
 *  (M1.5 gut pick, answered on the reward by the row's score).
 *  An option with `hold` does not finish the item: its feedback shows and
 *  the learner may pick again (B1 아직 없어요). An option with `if` shows
 *  only after the named choice. `evidence`: the item pays only when that
 *  record exists since the mission opened (the answer route checks it). */
export interface I7Choose extends IBase {
  type: "I7";
  from?: "seed_rows" | "work_map_rows" | "p_rows";
  fromLine?: string;
  options: { v: string; label: string; feedback?: string; hold?: boolean; if?: ChoiceIf }[];
  evidence?: "work_map_submitted";
  answer?: string | string[]; // array = pick exactly that many
  pick?: number; // how many to pick, default 1
  xp?: ItemXp;
  feedbackRight?: string;
  feedbackWrong?: string;
  layout?: "grid" | "list";
}

/** I1: sort cards into bins. Combo x2 from 4 in a row, x3 from 8; a wrong
 *  card returns once at `retry` points. Part total is capped by caps[part]. */
export interface I1Sort extends IBase {
  type: "I1";
  bins: SortAnswer[]; // ["p","j"] or ["p","mix","j"]
  cards: {
    key: string; // stable item key, e.g. "c1"
    text: string;
    answer: SortAnswer;
    why: string; // shown on a wrong pick and after a right one
    split?: { key: string; text: string; answer: Kind }[]; // for 'mix'
  }[];
  xp: { part: XpPart; per: number; retry: number };
  intro?: string;
  endAllRight?: string;
  endSome?: string; // {n} = right on first try
  endLow?: string; // when fewer than `lowBelow` right on first try
  lowBelow?: number;
}

/** I2: pick the better of two documents, then reveal difference chips.
 *  `own`: the documents are the learner's pasted Round 1 and Round 2 (B1 비교;
 *  docs carry labels, no text); after the pick the chips become one-line
 *  fields, and four lines save the sheet's differences. */
export interface I2Pick extends IBase {
  type: "I2";
  own?: boolean;
  docs: { v: string; label: string; text: string }[];
  answer: string;
  xp: ItemXp;
  wrongLine: string;
  chips: { name: string; find: string; placeholder?: string }[]; // `find` is a substring of the wrong doc; `placeholder` for an own-output chip's line
  /** Own-output only: the question under the round toggle, above the pick buttons. */
  ask?: string;
}

/** I3: tap the planted error in a document. After `hintAfter` wrong taps the
 *  section is highlighted; the find then pays `afterHint`. */
export interface I3Spot extends IBase {
  type: "I3";
  doc: string;
  target: string; // substring of the sentence that is the planted error
  xp: { part: XpPart; right: number; afterHint: number };
  hintAfter: number;
  rightLine: string;
  /** Shown on a wrong tap (default: a short "not there" line). */
  wrongLine?: string;
  /** Units that are not wrong taps (a computed +8% cell): a tap shows `line`,
   *  counts toward no hint and no skip-test tap, and is not stored. */
  neutral?: { find: string; line: string }[];
}

/** I4: score rows on the five-criteria card (Work Map scoring, SP-W1-SC). */
export interface I4Score extends IBase {
  type: "I4";
  /** Practice rows with an answer key; each criterion is one scored item. */
  rows: { key: string; title: string; fact: string; answers: [1 | 2 | 3, 1 | 2 | 3, 1 | 2 | 3, 1 | 2 | 3, 1 | 2 | 3]; lines: string[] }[];
  xp: { part: XpPart; per: number; retry: number };
  end: string;
}

/** I8: a timer for the learner's own run; entries go to the time log. */
export interface I8Timer extends IBase {
  type: "I8";
  label: string;
  method: "before" | "harness" | "pipeline";
  xp?: ItemXp; // pays on a saved entry with evidence, never on minutes
}

/** I9: the learner's own task. `target` says which artifact the step writes. */
export interface I9MyTask extends IBase {
  type: "I9";
  target:
    | "seed_rows" // M1.1: 2–3 seed rows into the work_map draft
    | "work_map_rows" // M1.3: rows + hours
    | "work_map_extra_row" // M1.3 확인: one more row
    | "work_map_classify" // M1.4: P/T for every row, mixed rows split
    | "work_map_candidates" // M1.5: scores + three candidates, then submit
    | "drill_left_for_human" // B1: one line
    | "drill_invention" // B1: the span Round 2 invented
    | "round2_card_start" // M1.2: the 2라운드 카드, first state (where my good example lives)
    | "round2_card"; // B1: its second state (my instruction line, the example and template places)
  xp: ItemXp;
  placeholders?: string[];
  /** The text the field starts with (the 2라운드 카드's instruction line). */
  prefill?: string;
}

export interface I10Checklist extends IBase {
  type: "I10";
  items: { key: string; label: string; say?: string; packId?: string }[];
  ordered?: boolean; // ticking out of order shows `orderLine`
  orderLine?: string;
  /** Ordered only: the items are shown in a fixed shuffled order, without
   *  numbers until ticked, so the learner recalls the order (B1 2라운드). */
  shuffle?: boolean;
  /** Shown above the items until the first tick (the first-pick question). */
  firstAsk?: string;
  /** Shown when the first tick is not the first item (instead of orderLine). */
  firstLine?: string;
  xp?: ItemXp;
}

/** I11: do a step in your own assistant and paste the result. The pasted
 *  text is kept in the learner's own course_local row (migration 0013,
 *  POST /api/course/local), readable by the learner only; the XP step
 *  records only that the step was done. */
export interface I11AssistantLab extends IBase {
  type: "I11";
  round: 1 | 2;
  steps: string[];
  minChars: number;
  packText?: string; // the 해담리빙 material offered as 복사
  exampleText?: string; // review-only "예시 결과 넣기"
  xp: ItemXp;
}

/** Tap-to-reveal term cards (M1.1 S2). Done when every card was opened. */
export interface ITerms extends IBase {
  type: "terms";
  cards: { word: string; kind: Kind; def: string; example: string }[];
  xp?: ItemXp;
}

/** Drag the seam between chunks (M1.4 S2). */
export interface ISeam extends IBase {
  type: "seam";
  chunks: string[];
  answer: number; // gap index where 처리 turns into 판단
  lines: Record<string, string>; // gap index -> feedback
  xp: ItemXp;
}

// --- Rows (migration 0012) --------------------------------------------------

export interface CourseProgressRow {
  user_id: string;
  mission_id: string;
  screen: number;
  done_at: string | null;
  result: string | null;
  updated_at: string;
}

export interface CourseXpRow {
  id: number;
  user_id: string;
  mission_id: string;
  part: XpPart;
  item: string;
  amount: number;
  correct: boolean | null;
  created_at: string;
}

/** public.course_local (migration 0013): what used to live only in the tab. */
export interface CourseLocalRow {
  user_id: string;
  mission_id: string;
  rounds: Partial<Record<"1" | "2", string>>;
  choices: Record<string, string>;
  slip: boolean;
  updated_at: string;
}

export interface CourseBadgeRow {
  user_id: string;
  badge_id: string;
  mission_id: string;
  created_at: string;
}

// --- Derived state (server, src/lib/course/state.ts) -------------------------

export interface MissionState {
  id: string;
  title: string;
  minutes: number;
  boss: boolean;
  status: "locked" | "open" | "done";
  screen: number;
  xp: number; // capped sum
  xpMax: number;
  parts: Record<XpPart, { got: number; cap: number }>;
}

export interface LevelState {
  level: number;
  title: string;
  goal: string;
  xp: number;
  xpMax: number;
  missions: MissionState[];
  badges: { id: string; label: string; earned: boolean; tool?: boolean }[];
  skipTest: { available: boolean; result: "passed" | "failed" | null };
}

// --- API --------------------------------------------------------------------

/** POST /api/course/answer — one scored item. The server checks `answer`
 *  against the content and writes the award. Idempotent per item key. */
export interface AnswerRequest {
  missionId: string;
  interactionId: string;
  /** Card or row key for I1/I4; omitted for single-answer items. */
  itemKey?: string;
  answer: string | string[] | number;
}
export interface AnswerResponse {
  correct: boolean | null;
  amount: number; // what this request paid (0 when replayed)
  combo?: 1 | 2 | 3; // I1/I4 multiplier applied
  retry?: boolean; // the item comes back once (I1)
  missionXp: number; // capped total after this award
}

/** POST /api/course/step — mark a non-scored step done (own-work beats,
 *  I11 rounds, terms, timers). The server verifies what it can (for example
 *  that the work_map draft has the rows) before paying. */
export interface StepRequest {
  missionId: string;
  interactionId: string;
  /** I11 only: the learner used "예시 결과 넣기" instead of their own
   *  assistant. The step is recorded at 0 XP (evidence, never self-report). */
  example?: boolean;
}
export interface StepResponse {
  amount: number;
  missionXp: number;
}

/** POST /api/course/progress — move the furthest screen; `done` on the
 *  reward screen sets done_at once and awards the mission's badges. */
export interface ProgressRequest {
  missionId: string;
  screen: number;
  done?: boolean;
}
export interface ProgressResponse {
  screen: number;
  doneAt: string | null;
  badges: string[]; // newly awarded
  /** Skip test start only: when the current attempt's clock started, and the seconds since (server clock). */
  startedAt?: string;
  elapsed?: number;
}

/** POST /api/course/local — save the mission's pasted rounds, branch picks
 *  and slip flag to the learner's own row. Each field present replaces the
 *  stored one; absent fields are kept. Keys are checked against the mission
 *  (a round its I11 has, an I7 without an answer and one of its options). */
export interface LocalSaveRequest {
  missionId: string;
  rounds?: Partial<Record<"1" | "2", string>>;
  choices?: Record<string, string>;
  slip?: boolean;
}

/** POST /api/course/interest — "tell me when Level N opens". No XP. */
export interface InterestRequest {
  course: MissionContent["course"];
  level: number;
}
export interface InterestResponse {
  course: string;
  level: number;
  since: string;
}

/** POST /api/course/skip — the skip test's result; on pass the server
 *  credits the skippable screens' XP in the level (game design §3.1). */
export interface SkipRequest {
  level: number;
  cards: string[]; // answers in card order
  pick: string;
  spotTaps: string[]; // tapped substrings in order
  seconds: number;
}
