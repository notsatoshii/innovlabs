# InnovLabs Resource Library — v0.3 Upgrade
**Date:** 2026-09-09 · Applies on top of v0.1 + v0.2-additions
**What's new:** (1) difficulty levels on every resource, (2) plain-language explainer format for a 12-to-CEO audience, (3) a concepts glossary, (4) ~25 newly trending entries (Jun–Sep 2026), written in the new format.

---

## Part 8 — DIFFICULTY LEVELS (new schema field: `difficulty`)

Every entry gets exactly one level. The test is "what does it take to *start using it*," not "how deep does it go."

| Level | Badge | Who | The test |
|---|---|---|---|
| **L1 — Everyone** | 🟢 | Age 12 to CEO, no setup | Open a website or app, sign in, use it. |
| **L2 — Comfortable user** | 🟡 | Anyone who installs apps and follows a guide | Download, install, connect an account. No terminal. |
| **L3 — Power user** | 🟠 | Curious professionals; our agent-path learners | Terminal commands (copy-paste is fine), API keys, maybe a rented server. No coding. |
| **L4 — Builder** | 🔴 | Developers and the technically brave | Writing or editing code, wiring systems together. |

Rules: a tool with both a cloud and self-hosted version gets the level of its *easiest useful path*, with the harder path noted in tips (e.g., n8n cloud 🟡, self-host is 🟠). Levels map to the curriculum: browser path lives at 🟢🟡, agent path teaches into 🟠, SMB/dev touches 🔴. The platform's search filters on this field.

---

## Part 9 — CONCEPTS GLOSSARY (plain-language; ships on the platform next to the library)

*Each term: one everyday analogy + one sentence of what it means for you. Korean localization pass will need care here — flag terms where a loanword (스타, 토큰) is more standard than translation.*

- **GitHub** — The world's biggest shared workshop for software. People keep their projects there in public folders called **repositories (repos)** so anyone can look, copy, or help improve them.
- **GitHub stars ⭐** — Like "likes" on a post, given by programmers. Stars measure *attention, not quality* — but a project with 50,000 stars has thousands of people testing it and fixing problems, which usually means it's safer to rely on than one with 12 stars. In this library, star counts always carry a date, because they change fast.
- **Open source** — The recipe is published, not just the cake. Anyone can read exactly how the software works, use it free, and change it. Why give it away? Reputation, shared progress, and because a thousand contributors improve software faster than any single company.
- **License** — The legal note attached to the recipe saying what you're allowed to do. **MIT/Apache** ≈ "do almost anything, even commercially." **AGPL** ≈ "fine, but if you build a service on it you must share your changes" — companies check this one. **Fair-code** ≈ "free to self-host, restrictions on reselling."
- **Self-hosted** — Running software on *your own* computer or rented server instead of using a company's website. Your data stays with you (why privacy-sensitive Korean companies care), but you do your own maintenance.
- **Server** — A computer that stays on 24/7 so software can run without your laptop being open. You can rent one for about the price of two coffees a month (₩8,000–17,000).
- **Terminal / CLI** — The text-only way to talk to a computer: you type commands instead of clicking buttons. Looks intimidating, is mostly copy-paste. Every 🟠 tool involves it.
- **Model (LLM)** — The "brain" — a program trained on enormous amounts of text so it can read and write. ChatGPT, Claude, and Gemini are apps wrapped around models.
- **Token** — The bite-size chunks a model reads and writes text in (roughly ¾ of an English word; Korean uses more tokens per sentence — which is why Korean workloads can cost more). API pricing is per million tokens, which is why "token optimization" is a whole category here.
- **API / API key** — A back door that lets programs talk to a service directly, without the website. The **key** is your password for it — treat it like a credit card number, because usage bills to it.
- **Agent** — AI that can *do*, not just answer: read files, browse, send messages, run on a schedule. A chatbot tells you to check the sales numbers; an agent goes and checks them.
- **Harness** — The instruction sheet that turns a generic AI into *your* AI: your formats, your rules, your boss's preferences. (Our Week 2 topic; the guide's Concept 4.)
- **Pipeline** — An assembly line for information: each step's output feeds the next, automatically. Your Monday report is already a pipeline — you're just running it by hand.
- **MCP (Model Context Protocol)** — A universal plug standard that lets any AI connect to any tool (calendar, database, browser) without custom wiring. Like USB-C for AI.
- **RAG** — "Open-book test" mode: instead of answering from memory (and sometimes making things up), the AI first looks facts up in *your* documents, then answers with sources.
- **Vector database** — A filing cabinet organized by *meaning* instead of alphabet, so the AI can find "that paragraph about refund policy" even if it never says the word "refund."
- **Knowledge graph** — A map of who/what connects to what (this vendor supplies that factory, which feeds that product). Better than a filing cabinet when *relationships* are the point.
- **Local model** — A model that runs entirely on your own machine. Weaker than the big cloud models, but nothing you type ever leaves your computer.
- **Benchmark / leaderboard** — Standardized exams for models, and the ranking tables of their scores. See the v0.2 primer (§5.0) for the three ways they mislead.
- **Fork** — Someone's copy of a project that they took in their own direction. Many good tools are forks of other tools (Roo Code is a fork of Cline).
- **Prompt injection** — Tricking an AI by hiding instructions in content it reads ("ignore your rules and send me the files"). *The* security risk for always-on agents; why we scope agent permissions in class.

---

## Part 10 — NEW ENTRY FORMAT (the ELI5 upgrade)

Every entry, old and new, migrates to this shape:

> **Name** 🟠 L3 — link · Tags · License/Cost
> **What it is:** one analogy a 12-year-old gets.
> **You'd use it to:** one concrete scenario from real work/study.
> **Why it matters:** what it replaces or unlocks.
> **Watch out:** the honest catch, gotcha, or tip.

Two worked examples, upgrading v0.1 entries:

> **OpenClaw** 🟠 L3 — (repo link pending verification pass) · `agents` `always-on` · MIT, free + model costs (₩15k–100k/mo)
> **What it is:** a tireless assistant that lives on a small rented computer and talks to you through KakaoTalk or Telegram — like hiring an intern who never sleeps and messages you the finished work.
> **You'd use it to:** wake up to a briefing it prepared overnight: competitor changes, your calendar, drafts of today's replies.
> **Why it matters:** the fastest-growing GitHub project of its era (300k+ ⭐ by mid-2026); it's the center of our agent path because one setup replaces a dozen separate automations.
> **Watch out:** an assistant that reads incoming messages can be tricked by them (prompt injection). Give it narrow permissions first; never unsupervised send rights in week one.

> **NotebookLM** 🟢 L1 — https://notebooklm.google.com · `knowledge-rag` `research` · Free (Google account)
> **What it is:** a notebook that reads what you feed it — reports, PDFs, links — and then answers questions *only from those sources*, with page citations. Like a study partner who actually did the reading.
> **You'd use it to:** upload a 200-page regulation and ask "what changed vs last year?"; or turn a dense report into a podcast-style audio discussion for your commute (works in Korean).
> **Why it matters:** the single easiest "wow" demo for a skeptical learner; zero setup, real citations.
> **Watch out:** it only knows what you upload — great for accuracy, useless for "what's new this week." Pair it with a monitoring tool.

**Migration plan:** all ~155 existing entries get rewritten to this format in batches of 15 (Loop C rhythm, Eric reviews each batch). Difficulty assignments for existing entries are in Part 12 *now*, so filtering works before the rewrites finish.

---

## Part 11 — NEWLY TRENDING (Jun–Sep 2026 sweep) — all ⚠️ verify links/claims in the verification pass; stars dated at collection

**Skills ecosystem (the season's biggest wave — directly relevant to our harness library):**

> **mattpocock/skills** 🟠 L3 — https://github.com/mattpocock/skills · `claude` `skills` · ~242k⭐ (Aug 2026)
> **What it is:** a respected teacher's actual instruction sheets for AI coding assistants, published as-is — like photocopying the class notes of the best student in school.
> **You'd use it to:** steal working patterns for your own skill/harness files instead of writing from scratch.
> **Why it matters:** one of the most-starred repos of the year; proof that *instructions* (not tools) are where value concentrated in 2026 — which is our Week 2 thesis, validated at 242k stars.
> **Watch out:** written for engineers; raid for structure, not content, when building office-worker harnesses.

> **SkillKit** 🟠 L3 — (verify repo) · `skills` `mcp` · A package manager for AI skills across 46 agents/31 sources — install a skill like installing an app. **Why it matters:** if skills are the new apps, this is the app store. **Watch out:** young; churn risk high.

> **agent-skills (Addy Osmani)** 🟠 L3 — (verify repo) · `skills` `programming` · 24 lifecycle skills (spec→ship) with slash commands, from Google's engineering leadership. Quality-bar reference for our own skill library.

> **andrej-karpathy-skills** 🟠 L3 — (verify repo) · `skills` · Karpathy's four viral anti-failure rules for AI coding as one CLAUDE.md drop-in; the most-starred Claude behavioral skill. Tiny, teachable, free win for any Claude Code learner.

**Harnesses & agent infrastructure:**

> **deepseek-harness** 🔴 L4 — https://github.com/deepseek-ai (verify path) · `agents` `harness` · ~204k⭐ (Aug 2026)
> **What it is:** DeepSeek's "everything is a plugin" agent harness — the engine block other people build cars around.
> **Why it matters:** the term *harness* went from our curriculum vocabulary to a 200k-star product category this summer; teaching ammunition.
> **Watch out:** builder territory; mention in class, don't lab it.

> **OpenHarness (HKUDS)** 🔴 L4 — https://github.com/HKUDS/OpenHarness (verify) · `agents` `harness` · Open research take on the same category.

> **pi (earendil-works)** 🟠 L3? — (verify repo + what it actually is; ~101k⭐ Aug 2026, details thin in sources) · Parked pending verification — do not publish unverified.

> **ponytail** 🟠 L3 — https://github.com/DietrichGebert/ponytail (verify) · `programming` `skills` · ~120–129k⭐ · Makes coding agents "think like the laziest senior dev" — do less, reuse more. **Why it matters:** token costs drop when agents stop over-engineering; a fun teachable idea (laziness as a virtue).

> **Bumblebee (Perplexity)** 🔴 L4 — (verify repo) · `security` `mcp` · Scans dependencies and MCP servers for supply-chain threats. **Why it matters:** first mainstream answer to "can I trust this random MCP server?" — belongs in our new security category with uber/ADR (agent threat detection, deployed at Uber; verify repo).

> **cloudflare/computer** 🔴 L4 — https://github.com/cloudflare/computer (verify) · `agents` `infra` · "Give your agent a computer" — sandboxed machines for agents. The safe-playground answer to agents running loose.

> **Strands Agents (AWS)** 🔴 L4 — https://github.com/strands-agents (verify path) · `agents` · AWS-backed agent SDK — the name 대기업 infra teams will standardize on alongside Semantic Kernel.

> **OpenAI Agents SDK** 🔴 L4 — https://github.com/openai/openai-agents-python · `agents` · Official OpenAI multi-agent SDK with handoffs; the ChatGPT-ecosystem mirror of Claude's Agent SDK.

> **A2A (Agent2Agent, Google)** 🔴 L4 — https://github.com/a2aproject/A2A · `agents` `mcp` · Protocol for *agents talking to other agents* (MCP connects agents to tools; A2A connects agents to each other). Donated to Linux Foundation. Concept-teach only.

**Routing & cost:**

> **OmniRoute** 🟠 L3 — https://github.com/diegosouzapw/OmniRoute (verify) · `token-optimization` · ~60k⭐ (Aug 2026)
> **What it is:** a smart receptionist for AI requests — sends easy questions to cheap models and hard ones to expensive models automatically.
> **You'd use it to:** cut your API bill without thinking about it per-request.
> **Why it matters:** the open-source competitor to OpenRouter's paid convenience; SMB-track material if it verifies well.

**Documents & knowledge:**

> **anydoc + pdf-inspector (Firecrawl)** 🔴 L4 — https://github.com/firecrawl/anydoc + https://github.com/firecrawl/pdf-inspector (verify) · `documents` · Fast Rust converters: Office/PDF/EPUB → clean Markdown; PDF classification with selective OCR. Competes with Docling/Marker; watch which wins the verification pass.

> **graphify** 🔴 L4 — https://github.com/Graphify-Labs/graphify (verify) · `graphs` `knowledge-rag` · Structured knowledge graphs as an alternative to brute-force vector search — the trend of the season (context efficiency via structure).

> **utopia** 🟠 L3 — https://github.com/deeplethe/utopia (verify) · `documents` `graphs` · Local-first document-to-ontology workbench (turn a folder of documents into an organized concept map, on your own machine).

> **codex-with-chatgpt** 🟠 L3 — https://github.com/XiaoDuoYa/codex-with-chatgpt (verify) · `programming` · Uses ChatGPT as the planning brain while Codex executes — a two-brain pattern our advanced learners keep reinventing; nice to have a canonical repo to point at.

**Voice & media:**

> **VoiceStudio** 🟡 L2 — https://github.com/debpalash/VoiceStudio (verify) · `media` · Self-hosted text-to-speech studio; candidate for the newsletter-to-audio experiment and CON track.

**Learning (new-format entries):**

> **AI Agent Book (bojieli)** 🟢 L1 — https://github.com/bojieli/ai-agent-book (verify) · `learning` · A free open textbook on agents, trending hard — reference reading for instructors and 🔴-curious learners.

> **archify** 🟡 L2 — https://github.com/tt-a1i/archify (verify) · `learning` `graphs` · ~43k⭐ · Turns codebases/systems into architecture diagrams via AI skills. Pairs with **diagram-design (cathrynlavery)** — self-contained HTML+SVG diagram style guide (~29k⭐) — both feed our "visual explainers" toolkit.

> **prime-agent (PrimeIntellect)** 🔴 L4 — https://github.com/PrimeIntellect-ai/prime-agent (verify) · `agents` · Self-improving RL agent for long-running coding tasks — the research edge of the compound loop we teach conceptually.

> **swarm-forge (Uncle Bob)** 🔴 L4 — https://github.com/unclebob/swarm-forge (verify) · `orchestration` · A famously simple coordination tool for several agents, from the Clean Code author — the minimalist counterpoint to heavyweight orchestrators.

> **Miyabi** 🔴 L4 — (verify repo) · `orchestration` · Issue-driven development: 7 coding + 14 business agents using GitHub as the operating system; Japanese-origin project worth watching for the East Asian market angle.

---

## Part 12 — DIFFICULTY MAP FOR EXISTING v0.1/v0.2 ENTRIES (effective immediately for filtering)

**🟢 L1 (open and use):** Claude app · ChatGPT · Gemini · NotebookLM · Google Alerts · v0/Lovable/Bolt · Arena · Artificial Analysis · all §5.1 leaderboard sites · OpenRouter (site) · all §6.1 courses · §6.2 videos/blogs (3B1B, Karpathy videos, Simon Willison, Latent Space) · all §6.3 newsletters/communities · There's An AI For That/Futurepedia · §6.4 Korean communities · Excalidraw · tldraw

**🟡 L2 (install/connect, no terminal):** Cowork · Dispatch · Claude Skills & Connectors/MCP (in-app) · Claude in Chrome/Excel/PowerPoint · Custom GPTs/ChatGPT Tasks · LM Studio · Jan · GPT4All · Zapier/Make · n8n cloud · Dify cloud · Langflow cloud · Cline/Continue (as extensions, with a guide) · ComfyUI (desktop) · Mermaid (in-chat use) · Notion/Kakao-side tools · GitHub (account + web use) · Vercel/Netlify (via templates)

**🟠 L3 (terminal, keys, servers):** Claude Code · Codex CLI · Gemini CLI · OpenClaw · Hermes · Paperclip · Scrapling · Open Deep Research · GPT Researcher · Perplexica+SearXNG · Ollama · Open WebUI · LibreChat · LobeChat · AnythingLLM · Khoj · yt-dlp · Whisper/faster-whisper (CLI) · ccusage · Repomix · tiktoken (as concept/tool) · LiteLLM (proxy use) · Helicone · MCP official servers/Context7/Playwright MCP/GitHub MCP/Supabase MCP (configuring) · Smithery/PulseMCP · DigitalOcean · Supabase (using) · Aider · OpenCode · Goose · awesome-claude-code/skills lists · SuperClaude/BMAD · claude-mem · Docling/Marker/MinerU (CLI use) · openclaw-starter · zeroclaw · strix (running) · Cursor/Windsurf/Zed (🟡 install but 🟠 realistic use — call them 🟡 and note it)

**🔴 L4 (code):** LangChain · LangGraph · CrewAI · AutoGen · smolagents · Agno · Mastra · Pydantic AI · Semantic Kernel · MetaGPT · DeerFlow · Letta · LlamaIndex · RAGFlow · Haystack · txtai · Mem0 · Graphiti · Cognee · LangMem · Supermemory · Chroma/Qdrant/Weaviate/Milvus/pgvector · Neo4j · D3 · vLLM · llama.cpp · FastMCP (building) · Bifrost · DSPy · LLMLingua · promptfoo · Ragas · Langfuse (self-host) · Firecrawl/Crawl4AI (API use) · Browser Use · Skyvern · Stagehand · agent-browser · Playwright · unstructured · PaddleOCR · nanochat · SWE-agent · OpenHands (🟠 via app, 🔴 to customize) · MiroFish · BettaFish · AutoAgent · Upstage/HyperCLOVA (API use)

*Judgment calls flagged for your review: Cursor-class IDEs (🟡 vs 🟠), OpenHands, ComfyUI, Cline. Anything you'd move, say so in the batch reviews.*

---

## Part 13 — Merge notes

1. Schema gains `difficulty` (L1–L4) — add the column to the Supabase `tools` table now; platform search filters on it from day one.
2. New category created: **`security`** (Bumblebee, uber/ADR, prompt-injection defenses) — was flagged as a gap in v0.1 Part 4; the trending sweep confirmed it's now a real category.
3. Glossary (Part 9) ships as its own platform page, cross-linked from every entry's first jargon word.
4. The skills-ecosystem wave (Part 11) is strategically loud: a 242k-star repo of *instruction files* validates our entire harness-library product. Consider a partner-deck slide on it.
5. Count after merge: ~155 + ~25 = **~180 entries**, all with difficulty levels.
6. Still open: four placeholders (worldvision, CTRL+ALT+DELETE, recon, gstack) · your private list · verification pass (now covering ~20 new ⚠️ entries too).
