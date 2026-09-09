# InnovLabs Resource Library — v0.1 (Draft)
**Date:** 2026-09-08 · **Language:** English working draft (Korean localization downstream, per protocol) · **Status:** List-building phase

---

## Part 0 — The Plan (how we create and organize this)

### 0.1 What this becomes
Three consumers, one source of truth:
1. **The platform's open-source tool library** (already scoped in the app: survey → profile → toolkit). This file is the seed content for that page.
2. **The curriculum's A3 volatile appendix** — the courses pull the short list ("taught"/"mentioned"); this library carries the long tail ("reference").
3. **The newsletter** — new entries and status changes are newsletter content for free.

### 0.2 Entry schema (target, for the Supabase version)
| Field | Notes |
|---|---|
| id, name, url | url must be verified live before status leaves DRAFT |
| category | one primary (see 0.3) |
| tags[] | freeform, lowercase, for subcategory filtering |
| summary | 2–4 sentences: what it is, what it's for |
| impact | why it matters / what it replaces |
| issues_tips | known problems, gotchas, tricks |
| license, cost | MIT/Apache/AGPL/fair-code/proprietary; $/mo if any |
| status | `taught` / `mentioned` / `reference` (matches curriculum rule: taught only if a session appendix has a demo variant) |
| korean_notes | Korean UI? Korean docs? relevance to KR market |
| last_verified | date; anything >90 days stale gets re-checked |

### 0.3 Primary categories
`agents` · `orchestration` · `research` · `scraping` · `memory` · `knowledge-rag` · `graphs` (knowledge graphs + diagramming) · `programming` · `mcp` · `token-optimization` · `claude` · `vendor-ai` (OpenAI/Google/etc.) · `local-models` · `documents` · `browser-automation` · `workflow-automation` · `observability-evals` · `infra` · `media` · `korea`

### 0.4 Build loop
1. **v0.1 (this file):** raw list, compact entries, placeholders flagged. ~110 entries.
2. **Eric pass:** fill the 4 placeholders, kill anything irrelevant, add your "many more" private list.
3. **Verification pass (Claude Code session):** script that checks every GitHub link is live, pulls current stars + license + last-commit date into the entry. Anything dead or abandoned (>6mo no commits) gets flagged.
4. **Expansion pass:** batches of ~15, each entry expanded to full schema (impact, issues_tips, korean_notes). You review batches like curriculum Loop C.
5. **Load into Supabase** (`tools` table matching 0.2) → platform toolkit page reads from it.
6. **Maintenance:** monthly re-verify job + changelog, same pattern as the A3 appendix change log. Star counts dated, never "current."

### 0.5 Rules
- No entry without a working link. Placeholders stay in the placeholder section until resolved.
- Star counts and prices always carry a date.
- One tool, one entry — if it appears in a course, the appendix references this library's id.
- Licenses matter for teaching: AGPL flagged (MiroFish), fair-code flagged (n8n), since corporate learners ask.

---

## Part 1 — PLACEHOLDERS (need your input — not findable in our project chats or on the web)

| Name you used | Status | Notes |
|---|---|---|
| **worldvision** | ❓ unresolved | Flagged as unfindable in our Sept 8 session too. Need the actual repo name/link. |
| **CTRL+ALT+DELETE** | ❓ unresolved | No AI repo by this name surfaces. Possibly discussed outside this Project (I can only search chats inside the current Project), or it's your shorthand for something. Link needed. |
| **recon** | ❓ ambiguous | Too generic to resolve — dozens of OSINT/recon repos exist (SpiderFoot, Amass, OSINT-Framework, OpenOSINT). If you mean one of those, say which; otherwise link needed. |
| **gstack** | ⚠️ partial | We referenced it (LEVER Command build: office-hours, review, sprint-lifecycle skills) but I have no public link on file. Confirm whether it's public or internal. |

---

## Part 2 — THE CANON (from our conversations, the guide, and your stack)

### 2.1 Open source — the guide's set

**OpenClaw** — https://github.com/openclaw (verify exact repo path)
`agents` `orchestration` · Tags: `always-on` `self-hosted` `messaging` `skills` `mit`
Always-on personal AI agent on your own server; connects to 20+ messaging platforms (KakaoTalk, Telegram, Slack, WhatsApp), Korean UI, 5,700+ community skills. The agent path's center in our curriculum; fastest-growing GitHub repo story of 2025–26 (300k+ stars by mid-2026). **Issues/tips:** prompt injection is the big risk for an always-on agent that reads inbound messages — scope its permissions, never give it unsupervised send rights early; the guide's own insurance-email anecdote is the cautionary tale. Budget model API spend (₩15k–100k/mo typical). Community "openclaw-starter" templates (SOUL.md, memory, kanban, heartbeat) cut setup to ~30 min.

**Hermes Agent** — Nous Research (verify current repo URL)
`agents` `memory` · Tags: `learning-loop` `skill-documents` `self-improving` `mit` `cheap-server`
Self-improving agent with a built-in learning loop: successful tasks become reusable skill documents, so it compounds — the guide's living demonstration of the compound loop. Provider-agnostic, runs on a $5 server. Our alternate agent-path center. **Tips:** the first 5–10 runs of any recurring task are the teaching window; correct outputs deliberately in that window and it stops asking questions it already knows.

**Paperclip** — MIT (verify repo URL)
`orchestration` · Tags: `multi-agent` `org-chart` `budgets` `dashboard`
Multi-agent orchestrator on an org-chart model with per-agent budgets and accountability. MGT track Weeks 8–10 and SMB; the 본부장 oversight pattern in the guide (cross-department exception surfacing) runs on this. **Tip:** its budget caps are the answer to the #1 B2B objection ("what if the agent runs up our API bill").

**Scrapling** — https://github.com/D4Vinci/Scrapling
`scraping` · Tags: `adaptive` `anti-breakage` `python` `monitoring`
Adaptive web scraper that survives site redesigns — relocates elements via similarity matching instead of breaking on layout changes. RES Week 6, SAL Week 5 on the agent path; the "eyes" of the competitive-intelligence loop. **Issues/tips:** adaptive matching isn't magic on full rewrites — pin the data points you care about and re-verify selectors quarterly; respect robots.txt and rate limits, especially for Korean portals (Naver aggressively blocks).

**Open Deep Research** — (verify which implementation: LangChain's or Hugging Face's; multiple repos share the name)
`research` · Tags: `multi-source` `citations` `pipeline` `mit`
Open-source deep-research pipeline: decomposes a question, searches in parallel, synthesizes a cited briefing. RES Week 4 agent path; runs without subscription limits, cost is API tokens. **Tip:** quality is 80% question decomposition — teach learners to write the research brief, not just the question.

**MiroFish** — AGPL (verify repo URL)
`research` `agents` · Tags: `simulation` `swarm` `public-reaction` `agpl` — Status: mentioned, not taught
Guo Hangjiang's society-simulation tool: thousands of simulated personas react to a scenario before you run it in reality. **Issues:** AGPL license (flag for corporate use); outputs are scenario-exploration, not prediction — teach it that way or lose credibility. Currently outside your active stack.

**BettaFish** — (verify repo URL)
`research` · Tags: `sentiment` `discourse-analysis` `social-media` — Status: mentioned, not taught
Sentiment analysis over social discourse: structure of who's saying what, which communities, trend over time. Replaces "reading comments and getting a vibe." Currently outside your active stack.

**AutoAgent** — (verify repo URL)
`agents` `token-optimization` · Tags: `harness-optimization` `self-tuning` — Status: mentioned (Week 2, "where harnesses go")
Optimizes its own harness overnight against a metric — the guide's proof that harness > model. **Tip:** the concept teaches even if the tool doesn't; use it as the Week 2 closer.

### 2.2 Anthropic / Claude
`claude` category throughout. Docs root: https://docs.claude.com

- **Claude app** (web/desktop/mobile) — https://claude.ai · Projects + custom instructions + memory = the Week 3 workspace. Both paths.
- **Claude Code** — https://docs.claude.com/en/docs/claude-code · Terminal/desktop coding agent; on the agent path it's the installer and maintainer of everything else. Your app is being built in it. **Tip:** the CLAUDE.md harness file pattern we use is the single highest-leverage practice to teach.
- **Cowork** — desktop knowledge-work agent, local files + connected apps, no terminal. The browser-path learner's nearest thing to always-on without a server ("always on while your laptop is").
- **Dispatch** — assign tasks from phone → Cowork session on desktop. Research preview, Pro/Max.
- **Skills** — reusable instruction folders; our harness library ships as Skills for Claude users (Week 2→7 bridge).
- **Connectors & MCP** — built-in Drive/Calendar/Gmail/Notion/Slack + any MCP server; the browser-path answer to "read my real files."
- **Claude API + Agent SDK** — https://docs.claude.com/en/api · Powers the app's generation slots; Agent SDK for building custom agents.
- **Claude in Chrome / Excel / PowerPoint, Claude Tag (Slack), Computer Use** — surface-specific agents; Excel matters for DAT track corporate learners.
- **Anthropic Cookbook** — https://github.com/anthropics/anthropic-cookbook · `claude` `programming` · Official recipes; the fastest source of teachable API patterns.

### 2.3 OpenAI
- **ChatGPT** (Projects, scheduled Tasks, Agent mode, Deep Research, data analysis, Custom GPTs) — https://chatgpt.com · The $20 browser-path assistant option; Tasks is the browser-path scheduling answer.
- **Codex** — https://openai.com/codex · Your daily coding agent alongside Claude Code; alternate installer on the agent path.

### 2.4 Google
- **NotebookLM** — https://notebooklm.google.com · `knowledge-rag` `research` · Source-grounded notebook with citations + Audio Overviews. Free; the guide's "memory" organ and the easiest wow-demo for Korean learners (Audio Overview does Korean).
- **Gemini app / Gemini in Workspace / Gemini Deep Research** — https://gemini.google.com · Assistant-in-the-documents for Workspace companies (DOC/DAT browser path).
- **Gemini CLI** — https://github.com/google-gemini/gemini-cli · Open-source terminal agent, ~99k stars (Mar 2026); generous free tier makes it the budget installer option.
- **Google Alerts** — https://www.google.com/alerts · The honest browser-path substitute for Scrapling.

### 2.5 Infrastructure (your stack)
- **DigitalOcean** — https://www.digitalocean.com · `infra` · The rented server ($6–12 basic droplet); one-click images for agent tools; source of the guide's ₩65k figure.
- **Supabase** — https://supabase.com · `infra` · DB/auth/RLS for the app and for SMB learner builds. Free tier teaches.
- **GitHub** — https://github.com · `infra` `programming` · Every agent config is a repo; history is the audit trail (P-principle in A2).
- **Vercel / Netlify** — https://vercel.com · https://netlify.com · `infra` · Static hosting; the website ships here.

---

## Part 3 — RESEARCHED ADDITIONS (v0.1; stars are approximate, dated Sept 2026 unless noted)

### 3.1 Agent frameworks & orchestration — `agents` `orchestration`

- **LangChain** — https://github.com/langchain-ai/langchain · ~130k★ · The foundational agent/chain library. **Issue:** notorious API churn between versions; pin versions in anything you teach.
- **LangGraph** — https://github.com/langchain-ai/langgraph · Stateful graph-based orchestration; the production-grade layer over LangChain. This is what "pipelines with judgment gates" looks like in code.
- **CrewAI** — https://github.com/crewAIInc/crewAI · ~45k★ · Role-based multi-agent teams; the easiest mental model for non-engineers (agents = job titles). Good SMB demo.
- **AutoGen** — https://github.com/microsoft/autogen · ~54k★ · Microsoft's conversation-driven multi-agent framework.
- **AutoGPT** — https://github.com/Significant-Gravitas/AutoGPT · ~183k★ · The 2023 pioneer; today mostly historical + a low-code platform. Teach as history, not tooling.
- **smolagents** — https://github.com/huggingface/smolagents · ~25k★ · Hugging Face; agents write Python instead of JSON tool calls. Minimal and readable — good for teaching how agents actually work.
- **Agno** — https://github.com/agno-agi/agno · ~26k★ · High-performance multimodal agent runtime.
- **Mastra** — https://github.com/mastra-ai/mastra · ~23k★ · TypeScript-native agent framework — relevant since your app stack is TS.
- **Pydantic AI** — https://github.com/pydantic/pydantic-ai · Type-safe agent framework from the Pydantic team; structured outputs done right.
- **Semantic Kernel** — https://github.com/microsoft/semantic-kernel · Microsoft's enterprise SDK; the name to know for 대기업 .NET shops.
- **MetaGPT** — https://github.com/FoundationAgents/MetaGPT · Multi-agent "software company" simulation.
- **DeerFlow** — https://github.com/bytedance/deer-flow · ByteDance's deep-research multi-agent framework; #1 GitHub trending Feb 2026, 25k+★. ⚠️ verify current state.
- **Letta (MemGPT)** — https://github.com/letta-ai/letta · Agent runtime with tiered self-edited memory (core/recall/archival); Apache 2.0. Doubles as a memory entry below.

### 3.2 No/low-code builders & workflow automation — `workflow-automation`

- **n8n** — https://github.com/n8n-io/n8n · ~184k★ · Drag-and-drop workflow automation, now the de-facto action layer for agents. **Issue:** fair-code license, not OSI open source — flag for corporate learners; self-host is free.
- **Dify** — https://github.com/langgenius/dify · ~139k★ · Visual LLM-app platform: workflows, RAG, agents, model management. Strong Asian-market adoption and docs.
- **Langflow** — https://github.com/langflow-ai/langflow · ~146k★ · Visual drag-and-drop agent/RAG builder.
- **Flowise** — https://github.com/FlowiseAI/Flowise · ~51k★ · Same category, lighter.
- **Activepieces** — https://github.com/activepieces/activepieces · Open-source Zapier alternative with MCP support.
- **Zapier / Make** — https://zapier.com · https://make.com · Proprietary but the browser-path automation reality inside corporate IT; Zapier MCP fronts thousands of app actions.

### 3.3 Research & search — `research`

- **GPT Researcher** — https://github.com/assafelovic/gpt-researcher · The most established open deep-research agent; also ships as an MCP server.
- **STORM** — https://github.com/stanford-oval/storm · Stanford; writes Wikipedia-style long-form reports with citations via multi-perspective research.
- **Perplexica** — https://github.com/ItzCrazyKns/Perplexica · Open-source Perplexity clone; pairs with SearXNG for a fully self-hosted answer engine.
- **SearXNG** — https://github.com/searxng/searxng · Self-hosted meta-search engine; the private search backend for agent pipelines.
- **Tavily** — https://tavily.com · Search API built for LLM agents; the easiest "give your agent web search" ingredient. Paid beyond free tier.
- **Exa** — https://exa.ai · Neural/semantic search API for agents; finds by meaning, not keywords.
- **openwiki** — https://github.com/langchain-ai/openwiki · ~12k★ (Jul 2026) ⚠️ verify · Auto-generated wiki/docs over codebases.

### 3.4 Scraping & browser automation — `scraping` `browser-automation`

- **Firecrawl** — https://github.com/firecrawl/firecrawl · Web → LLM-ready markdown: search, scrape, crawl, parse APIs. The current default "web context for agents" layer; self-hostable, hosted tier paid.
- **Crawl4AI** — https://github.com/unclecode/crawl4ai · Open-source LLM-friendly crawler; the free/self-hosted Firecrawl alternative.
- **Browser Use** — https://github.com/browser-use/browser-use · ~88k★ · Makes websites accessible to agents; 0→78k stars in months. **Issue:** brittle on CAPTCHA/login walls; teach it for internal/authenticated-by-user flows, not adversarial sites.
- **Playwright** — https://github.com/microsoft/playwright · The browser-automation substrate most agent tools build on; also an official MCP server.
- **Skyvern** — https://github.com/Skyvern-AI/skyvern · ~21.5k★ · Vision-first browser automation for production workflows.
- **Stagehand** — https://github.com/browserbase/stagehand · AI browser automation SDK blending code + natural language; from Browserbase.
- **agent-browser** — https://github.com/vercel-labs/agent-browser · Rust, ~26k★ (2026) ⚠️ verify · Vercel Labs' fast browser layer for agents.
- **yt-dlp** — https://github.com/yt-dlp/yt-dlp · Media/audio downloader; the front end of every "summarize this video/lecture" pipeline.

### 3.5 Memory — `memory`

- **Mem0** — https://github.com/mem0ai/mem0 · The best-known memory layer: extracts facts, reconciles, retrieves. **Issue:** headline benchmarks are vendor-run and contested (independent LongMemEval measured ~49 vs claimed ~94) — teach with skepticism about all memory benchmarks.
- **Zep / Graphiti** — https://github.com/getzep/graphiti · Temporal knowledge graph memory: facts carry validity windows, stale facts auto-invalidate. Zep cloud is proprietary; Graphiti itself is open source and the interesting piece. Bridges into `graphs`.
- **Cognee** — https://github.com/topoteretes/cognee · Knowledge graph + embeddings hybrid memory, Apache 2.0, nothing paywalled — the safest self-hosted teaching pick.
- **LangMem** — https://github.com/langchain-ai/langmem · LangGraph-native memory SDK.
- **Supermemory** — https://github.com/supermemoryai/supermemory · Vector-graph memory; local self-host free, managed platform closed.
- **claude-mem** — https://github.com/thedotmack/claude-mem ⚠️ verify path · Persistent context across sessions for coding agents (Claude Code, Codex, OpenClaw, Hermes) — compresses session history and re-injects. Directly relevant to your Claude Code workflow.

### 3.6 Knowledge & RAG — `knowledge-rag`

- **LlamaIndex** — https://github.com/run-llama/llama_index · ~47k★ · 160+ data connectors; the data-framework standard for RAG pipelines.
- **RAGFlow** — https://github.com/infiniflow/ragflow · Deep-document-understanding RAG engine with citations; strong on messy real-world docs.
- **Haystack** — https://github.com/deepset-ai/haystack · Production RAG framework, enterprise-grade.
- **txtai** — https://github.com/neuml/txtai · Lightweight all-in-one embeddings DB + RAG; smallest teachable footprint.
- **AnythingLLM** — https://github.com/Mintplex-Labs/anything-llm · All-in-one desktop/Docker RAG + agents app; the "NotebookLM you own."
- **Khoj** — https://github.com/khoj-ai/khoj · Self-hosted AI second brain over your notes/docs — maps directly onto the platform's "second brain" promise.
- **Morphik / Verba etc.** — long tail; add after verification pass.

### 3.7 Graphs (knowledge graphs + visualization) — `graphs`

- **Neo4j** — https://github.com/neo4j/neo4j · The graph database; Community Edition free. Backend for Graphiti-style temporal memory. **Issue:** real ops overhead — don't teach unless the learner needs it.
- **Mermaid** — https://github.com/mermaid-js/mermaid · Text→diagram; the lingua franca of AI-generated diagrams (Claude/ChatGPT emit it natively). Teach in Week 1 for Work Maps.
- **Excalidraw** — https://github.com/excalidraw/excalidraw · Hand-drawn-style whiteboard, open source; pipeline-sketching in workshops.
- **D2** — https://github.com/terrastruct/d2 · Modern declarative diagramming language; cleaner output than Mermaid for architecture.
- **tldraw** — https://github.com/tldraw/tldraw · Canvas SDK; also the "make real" AI-sketch-to-UI demos.
- **D3** — https://github.com/d3/d3 · The data-visualization substrate if the app ever renders custom profile graphs.

### 3.8 Vector databases — `knowledge-rag` `infra`

- **Chroma** — https://github.com/chroma-core/chroma · Simplest embeddable vector DB; the teaching default.
- **Qdrant** — https://github.com/qdrant/qdrant · Rust vector DB; official MCP server exists.
- **Weaviate** — https://github.com/weaviate/weaviate · Hybrid search with built-in ML modules.
- **Milvus** — https://github.com/milvus-io/milvus · Scale-out vector DB.
- **pgvector** — https://github.com/pgvector/pgvector · Vectors inside Postgres — which means inside **Supabase**, which means this is what your app should use. Zero extra infra.

### 3.9 Programming / coding agents — `programming`

- **Aider** — https://github.com/Aider-AI/aider · Terminal pair-programmer, git-native; the open-source Claude Code alternative.
- **Cline** — https://github.com/cline/cline · Autonomous coding agent in VS Code; huge adoption.
- **Roo Code** — https://github.com/RooCodeInc/Roo-Code · Cline fork with multi-mode agents.
- **Continue** — https://github.com/continuedev/continue · Open-source IDE assistant; bring-your-own-model.
- **OpenHands** — https://github.com/All-Hands-AI/OpenHands · ~44k+★ · Full autonomous dev agent platform (ex-OpenDevin).
- **SWE-agent** — https://github.com/SWE-agent/SWE-agent · Princeton; takes a GitHub issue → fix. The research benchmark lineage.
- **Goose** — https://github.com/block/goose · Block's extensible local agent; MCP-native.
- **OpenCode** — https://github.com/sst/opencode · Open-source terminal coding agent, provider-agnostic; the community's answer to Claude Code.
- **Cursor / Windsurf / Zed** — https://cursor.com · https://windsurf.com · https://zed.dev · The AI-IDE tier (proprietary except Zed, which is open source).
- **nanochat** — https://github.com/karpathy/nanochat · Karpathy's full minimal LLM training stack — the single best "how it actually works" teaching repo.
- **v0 / Lovable / Bolt** — https://v0.dev · https://lovable.dev · https://bolt.new · Prompt-to-app builders; the SMB track's fastest prototype path. (bolt.diy is the open-source variant: https://github.com/stackblitz-labs/bolt.diy)

### 3.10 MCP ecosystem — `mcp`

- **MCP spec + official servers** — https://github.com/modelcontextprotocol/servers · ~84k★ · The reference servers (filesystem, git, memory, fetch...). Start here.
- **awesome-mcp-servers** — https://github.com/punkpeye/awesome-mcp-servers · The community index; thousands of servers.
- **FastMCP** — https://github.com/jlowin/fastmcp · The Pythonic way to build an MCP server in minutes — this is how learners build their *first* custom tool.
- **Context7** — https://github.com/upstash/context7 · Live, version-correct library docs injected into coding agents; fixes hallucinated APIs. Near-default in Claude Code setups.
- **Playwright MCP** — https://github.com/microsoft/playwright-mcp · Browser control as MCP.
- **GitHub MCP** — https://github.com/github/github-mcp-server · Official; repos/issues/PRs as tools.
- **Supabase MCP** — https://github.com/supabase-community/supabase-mcp · SQL + schema + logs; directly useful for your app build.
- **Smithery** — https://smithery.ai · MCP registry/hosting.
- **PulseMCP** — https://pulsemcp.com · Directory + news; good maintenance-pass source.
- **Bifrost** — https://github.com/maximhq/bifrost · Open-source AI/MCP gateway; claims up to 92% input-token reduction on big tool catalogs. Bridges into token-optimization.
- **codebase-memory-mcp** — https://github.com/DeusData/codebase-memory-mcp ⚠️ verify · ~32k★ (Jul 2026) trending; persistent codebase understanding across sessions.

### 3.11 Token & cost optimization — `token-optimization`

- **LiteLLM** — https://github.com/BerriAI/litellm · One OpenAI-format proxy for 100+ providers, with spend tracking, budgets, fallbacks. The "lower your AI burn" infrastructure piece — directly serves your SMB promise.
- **OpenRouter** — https://openrouter.ai · One API key, all models, price-shopping per request; the fastest way to teach model-cost tradeoffs.
- **LLMLingua** — https://github.com/microsoft/LLMLingua · Microsoft; prompt compression up to ~20x with minor quality loss. The research-grade token-optimization demo.
- **ccusage** — https://github.com/ryoppippi/ccusage · CLI that reads Claude Code local logs → daily/session token cost reports. Instant "know your burn" habit; zero setup.
- **Repomix** — https://github.com/yamadashy/repomix · Packs a repo into one AI-friendly file with token counts; context-stuffing done deliberately.
- **tiktoken** — https://github.com/openai/tiktoken · The tokenizer; teach learners to *see* tokens once and pricing stops being abstract.
- **Helicone** — https://github.com/Helicone/helicone · Open-source LLM observability + cost tracking proxy.
- **Prompt caching (Anthropic)** — https://docs.claude.com/en/docs/build-with-claude/prompt-caching · Up to 90% cost cut on repeated context — the single biggest lever for your app's generation slots (cache the harness, pay for the variable part).
- **DSPy** — https://github.com/stanfordnlp/dspy · Programs, not prompts: optimizes prompts against metrics automatically. The serious version of what AutoAgent gestured at.

### 3.12 Claude ecosystem (community) — `claude`

- **awesome-claude-code** — https://github.com/hesreallyhim/awesome-claude-code · Curated commands, CLAUDE.md patterns, workflows.
- **awesome-claude-skills** — (multiple lists; verify best-maintained fork) · 1,000+ production Claude Skills — raid it for harness-library ideas.
- **anthropics/skills** — https://github.com/anthropics/skills · Official skill examples.
- **SuperClaude** — https://github.com/SuperClaude-Org/SuperClaude_Framework · Config framework adding commands/personas to Claude Code. **Caution:** heavy context overhead; teach the idea, warn about token cost.
- **BMAD-METHOD** — https://github.com/bmad-code-org/BMAD-METHOD · Agile agent-team methodology (PM/architect/dev agents) on top of coding agents; popular with solopreneurs building real products.
- **Claude Code templates** — https://github.com/davila7/claude-code-templates ⚠️ verify · CLI for agents/commands/MCPs/settings.

### 3.13 Local models & inference — `local-models`

- **Ollama** — https://github.com/ollama/ollama · ~169k★ · Run LLMs locally in one command. The privacy answer for 개인정보보호법-nervous companies. **Tip:** quantized 7–14B models on a MacBook are fine for drafting, not for judgment tasks — set expectations.
- **llama.cpp** — https://github.com/ggml-org/llama.cpp · The inference engine underneath everything local.
- **vLLM** — https://github.com/vllm-project/vllm · Production-grade serving; what a company deploys when local goes serious.
- **LM Studio** — https://lmstudio.ai · GUI local-model runner; the non-terminal path.
- **Open WebUI** — https://github.com/open-webui/open-webui · ~132k★ · Self-hosted ChatGPT-style UI with access control — the "company ChatGPT on our server" demo.
- **LibreChat** — https://github.com/danny-avila/LibreChat · Self-hosted multi-provider chat.
- **LobeChat** — https://github.com/lobehub/lobe-chat · Same category, plugin system, polished.
- **GPT4All / Jan** — https://github.com/nomic-ai/gpt4all · https://github.com/menloresearch/jan · Consumer local chat apps.

### 3.14 Documents & data extraction — `documents`

- **Docling** — https://github.com/docling-project/docling · IBM; PDF/DOCX/PPTX → structured markdown/JSON. Current best-in-class open document parser.
- **Marker** — https://github.com/datalab-to/marker · Fast PDF → markdown with layout awareness.
- **MinerU** — https://github.com/opendatalab/MinerU · Strong on scientific/complex PDFs, tables, formulas.
- **Unstructured** — https://github.com/Unstructured-IO/unstructured · ETL for LLM data from 20+ file types.
- **PaddleOCR** — https://github.com/PaddlePaddle/PaddleOCR · OCR with solid Korean support — matters for scanned 공문/계약서 workflows.
- **Whisper / faster-whisper** — https://github.com/openai/whisper · https://github.com/SYSTRAN/faster-whisper · Speech-to-text; the meeting-minutes pipeline's front end. Korean accuracy is good; teach speaker-labeling limits honestly.

### 3.15 Observability & evals — `observability-evals`

- **Langfuse** — https://github.com/langfuse/langfuse · Open-source LLM tracing/evals/prompt management; the self-hostable default.
- **promptfoo** — https://github.com/promptfoo/promptfoo · Test prompts like code (also red-teaming). This is how you regression-test the app's generation slots and the harness library.
- **Ragas** — https://github.com/explodinggradients/ragas · RAG evaluation metrics.
- **Braintrust** — https://braintrust.dev · Eval platform (proprietary, good free tier).

### 3.16 Media & creative — `media`

- **ComfyUI** — https://github.com/comfyanonymous/ComfyUI · Node-graph image/video generation — literally teaches "pipelines" visually; CON track candidate.
- **OpenAI Whisper** — (above) · doubles here for subtitle/translation workflows.
- **Kokoro / F5-TTS** — https://github.com/hexgrad/kokoro · https://github.com/SWivid/F5-TTS ⚠️ verify Korean quality · Open TTS; newsletter-to-audio experiments.

### 3.17 Korea-specific — `korea`

- **Upstage** — https://upstage.ai · Korean AI company; Solar LLM + Document AI (strong on Korean documents/OCR). The domestic-vendor name B2B buyers will ask about.
- **Naver HyperCLOVA X** — https://clova.naver.com · Naver's Korean-first LLM; CLOVA Studio API. Relevant for data-residency-sensitive clients.
- **Kakao 카카오워크 / KakaoTalk 채널 API** — https://www.kakaowork.com · Where Korean-workplace agent notifications actually land; OpenClaw's KakaoTalk bridge is a differentiator for us.
- **HuggingFace Korean models (EEVE, KULLM, etc.)** — https://huggingface.co · Open Korean-tuned models for the local path. Verify current best before teaching.

### 3.18 Recently trending — verify before promoting out of DRAFT ⚠️
(High star-velocity in the last 3–6 months per OSS Insight / Analytics Vidhya roundups; links reported, not yet independently verified by us.)

- **strix** — https://github.com/usestrix/strix · ~42k★ (Jul 2026) · Autonomous AI pentest agents. Security-education demo value.
- **zeroclaw** — https://github.com/zeroclaw-labs/zeroclaw · ~29k★ in 49 days (Q1 2026) · Rust rebuild of the OpenClaw idea — tiny footprint, fast.
- **llmfit** — https://github.com/AlexsJones/llmfit · ~21k★ · Fit/quantization tooling (Rust wave).
- **openfang** — https://github.com/RightNow-AI/openfang · ~16k★ · Rust agent infra.
- **Vibe-Trading (HKUDS)** — https://github.com/HKUDS · ~24k★ · Agentic trading research. ⚠️ Do NOT teach — financial-advice liability; catalog as "what's out there" only.
- **ai-job-search** — https://github.com/MadsLorentzen/ai-job-search · ~23k★ · Agentic job-search automation; interesting for the student/job-seeker segment later.
- **ironclaw** — https://github.com/nearai/ironclaw · ~11k★ · Another Rust agent runtime.

---

## Part 4 — Count & gaps

**Entries: ~112** (canon 34 + researched ~78), 4 placeholders pending your input.

Known gaps to fill in v0.2: (1) your private "many more" list; (2) agent security/guardrails category (prompt-injection defenses — we teach the risk, we should catalog the tools); (3) Korean community resources (카페/Discord/뉴스레터 sources for the maintenance loop); (4) awesome-lists as meta-sources; (5) verification pass outputs (live stars, licenses, last-commit).
