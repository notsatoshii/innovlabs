# InnovLabs Resource Library — v0.2 Additions
**Date:** 2026-09-08 · Merges into innovlabs-resource-library-v0.1.md after review
**New categories:** `benchmarks` · `learning` (+ `korea` additions)

---

## Part 5 — BENCHMARKS & LEADERBOARDS — `benchmarks`

### 5.0 How to read a leaderboard (the primer — this is curriculum content, Week 9 verification territory)

ELI5: model benchmarks are like school exams. Three problems every exam has:
1. **Preference ≠ capability.** Arena-style boards measure which answer *humans liked*, not which was *correct*. Liked answers tend to be longer and prettier. Use style-controlled views.
2. **Studying for the test (contamination).** If the test questions leaked into training data, scores are inflated. Trust benchmarks that rotate questions (LiveBench) or use post-cutoff problems (LiveCodeBench).
3. **The teacher grading their own kid (vendor-run scores).** Launch-post numbers are cherry-picked; memory-tool benchmarks especially (see Mem0 entry in v0.1). Prefer independently-run leaderboards, and treat small rank gaps as noise.

**Teaching rule:** pick the board that matches the job — coding → SWE-bench Verified + Aider Polyglot; reasoning → GPQA Diamond/AIME; tool use → BFCL; "what do people like" → Arena; cost/speed tradeoffs → Artificial Analysis. Re-check quarterly, never mid-course.

### 5.1 The boards to bookmark

- **Arena** (formerly LMArena / LMSYS Chatbot Arena) — https://arena.ai (lmarena.ai redirects; rebranded Jan 2026) · Crowdsourced blind head-to-head votes → Elo, across text/code/vision/webdev sub-arenas; 6.8M+ votes. The "which model do humans prefer" signal. **Catch:** preference, not accuracy; rewards length/formatting.
- **Artificial Analysis** — https://artificialanalysis.ai · Independent intelligence index + live speed, latency, price, context window in one view. The best single site for cost/performance decisions — this is the one to teach SMB learners watching their burn.
- **SWE-bench** — https://www.swebench.com · Princeton; real GitHub issues, actual test suites. The canonical coding-agent board (Verified subset is the quoted number; Pro is the harder successor).
- **Aider LLM Leaderboards** — https://aider.chat/docs/leaderboards/ · Polyglot benchmark: 225 hard Exercism exercises across 6 languages, inside a real edit loop, with **cost per run tracked** — the most honest "coding value per won" board.
- **LiveBench** — https://livebench.ai · Contamination-resistant by design: questions rotate monthly across math/coding/reasoning/data/IF/language.
- **LiveCodeBench** — https://livecodebench.github.io · Coding problems published after model cutoffs.
- **BFCL (Berkeley Function-Calling Leaderboard)** — https://gorilla.cs.berkeley.edu/leaderboard.html · The only widely-trusted tool-use/function-calling benchmark — directly relevant to agent curriculum claims.
- **Terminal-Bench** — https://www.tbench.ai ⚠️ verify URL · Terminal-agent tasks; the board Claude Code-class tools compete on.
- **OSWorld** — https://os-world.github.io · Computer-use tasks in real OS environments.
- **ARC Prize / ARC-AGI** — https://arcprize.org · Abstract reasoning; the "is it actually intelligent" benchmark, deliberately resistant to memorization.
- **Humanity's Last Exam** — https://lastexam.ai · Expert-written frontier knowledge exam; the current "hardest paper test."
- **Hugging Face Leaderboards & Daily Papers** — https://huggingface.co/spaces + https://huggingface.co/papers · Note: the classic Open LLM Leaderboard is **retired** — teach that, since Korean blog posts still cite it. HF Spaces host most academic boards.
- **Vellum LLM Leaderboard** — https://www.vellum.ai/llm-leaderboard · Clean aggregator incl. open-weight models + inference-provider speed comparisons (Cerebras/Groq/Together etc.).
- **LLM Stats** — https://llm-stats.com · Aggregator with pricing/context/speed per model.
- **BenchLM** — https://benchlm.ai · Aggregator tracking 400+ benchmarks with a category-weighted methodology; currently the most frequently updated honest aggregator per community consensus. ⚠️ young site — keep an eye on longevity.
- **OpenRouter Rankings** — https://openrouter.ai/rankings · Revealed preference: which models people *actually route real traffic to*, by token volume. No benchmark can fake this; my favorite sanity check against leaderboard hype.
- **Scale SEAL Leaderboards** — https://scale.com/leaderboard · Private, unpublished eval sets — contamination-proof by construction.
- **METR** — https://metr.org · Evaluates autonomous/long-horizon task ability ("time horizon" studies) and safety-relevant capability; the serious answer to "can agents really work alone for hours."
- **Epoch AI** — https://epoch.ai · Data and trend analysis on compute, model scaling, benchmark trajectories. The macro view — great for the "why now" slide with sourced numbers.
- **awesome-llm-bench** — https://github.com/leoncuhk/awesome-llm-bench · Daily-synced top-10 mirror of the high-signal boards; good raw feed for our platform's changelog wall.

---

## Part 6 — LEARNING & STAYING CURRENT — `learning`

### 6.1 For new users (browser-path learners; pre-course and homework material)

- **Anthropic Prompt Engineering Interactive Tutorial** — https://github.com/anthropics/prompt-eng-interactive-tutorial · Free, hands-on notebooks, beginner→advanced incl. chaining and tool use. The best free hands-on primer; candidate for official pre-work on the Claude path.
- **Anthropic Academy / docs courses** — https://www.anthropic.com/learn ⚠️ verify current URL · First-party structured courses.
- **OpenAI Academy** — https://academy.openai.com · Free short video courses incl. prompt engineering; the ChatGPT-path equivalent.
- **Learn Prompting** — https://learnprompting.org · The largest free open-source prompting curriculum; good glossary source for our Korean localization pass.
- **Prompt Engineering Guide (DAIR.AI)** — https://www.promptingguide.ai · The reference-style guide; has a **Korean translation**, which makes it one of the few quality Korean-language prompting references — cite it, don't compete with it.
- **DeepLearning.AI Short Courses** — https://www.deeplearning.ai/short-courses/ · Free 1–2hr courses, many co-built with Anthropic/OpenAI/LangChain; "ChatGPT Prompt Engineering for Developers" remains the standard technical primer.
- **Vanderbilt Prompt Engineering (Coursera)** — https://www.coursera.org/learn/prompt-engineering · The university-credential option; free to audit. B2B HRD buyers recognize Coursera — useful comparable when pricing our courses.
- **Google AI Essentials / Cloud GenAI learning path** — https://grow.google/ai-essentials/ + https://www.cloudskillsboost.google · The corporate-friendly beginner credential.
- **Kaggle Learn** — https://www.kaggle.com/learn · Free micro-courses; the on-ramp for DAT-track learners who get curious about the layer below.

### 6.2 For experienced users (agent-path, SMB, and us)

- **Karpathy "Zero to Hero" + nanochat/nanoGPT** — https://karpathy.ai/zero-to-hero.html + https://github.com/karpathy/nanochat · Build a GPT from scratch on video; the deepest "how it actually works" path. nanochat already in v0.1 §3.9.
- **Hugging Face Learn (Agents Course, smol-course, NLP course)** — https://huggingface.co/learn · Free, current, hands-on; the Agents Course is the best structured agent-building curriculum right now.
- **fast.ai** — https://www.fast.ai · Practical deep learning, top-down teaching philosophy — worth studying for pedagogy as much as content (their "whole game first" approach matches our Work-Map-first design).
- **3Blue1Brown neural network series** — https://www.3blue1brown.com/topics/neural-networks · The visual intuition layer; the transformer/attention videos are the single best 20 minutes for a curious learner.
- **Stanford CS courses on YouTube (CS229, CS224n, CS25 Transformers)** — https://www.youtube.com/@stanfordonline · Free graduate lectures when someone wants the real thing.
- **Chip Huyen — AI Engineering** — https://huyenchip.com · The book + blog defining the AI-engineering discipline; reading list for instructors.
- **Simon Willison's blog** — https://simonwillison.net · The practitioner's daily changelog of what's actually new and what it means; probably the highest signal-per-post source in the field. Feed for our maintenance loop.
- **Anthropic Engineering blog** — https://www.anthropic.com/engineering · First-party deep dives (context engineering, agent patterns); "Building Effective Agents" is required instructor reading.
- **Latent Space** — https://www.latent.space · Podcast + newsletter for AI engineers; where the agent-builder discourse happens.

### 6.3 News & staying current (the maintenance-loop feeds + platform changelog sources)

- **AI News (smol.ai)** — https://news.smol.ai · The exhaustive daily digest of AI Twitter/X, Reddit, Discords — machine-summarized. The single best input for our monthly library re-verify pass.
- **TLDR AI** — https://tldr.tech/ai · Daily 5-minute engineer-oriented digest, 1.25M+ subs.
- **The Batch (DeepLearning.AI)** — https://www.deeplearning.ai/the-batch/ · Weekly, Andrew Ng's framing; calm and reliable.
- **Ben's Bites** — https://bensbites.com · Founder/operator angle.
- **The Rundown AI / The Neuron** — https://www.therundown.ai + https://www.theneuron.ai · High-circulation general-audience dailies; know them because learners will cite them.
- **AlphaSignal** — https://alphasignal.ai · Weekly, ML-engineer technical signal.
- **r/LocalLLaMA** — https://www.reddit.com/r/LocalLLaMA/ · Where local-model reality gets stress-tested before blogs write it up; best early-warning channel for open-weight releases.
- **Hacker News** — https://news.ycombinator.com · Still where tool launches live or die.
- **There's An AI For That** — https://theresanaiforthat.com · Largest consumer AI-tool directory (30k+); noisy, but useful for "does a tool for X exist" triage. Futurepedia (https://www.futurepedia.io) similar.

### 6.4 Korea-specific — `korea` `learning` ⚠️ verify all before teaching

- **지피터스 (GPTers)** — https://www.gpters.org · Korea's largest AI-practitioner community (study groups, case sharing, 캠프). Both a distribution channel and a competitor-adjacent player for us — worth a proper analysis, not just a listing.
- **AI타임스** — https://www.aitimes.com · Korean AI news daily; the domestic press feed.
- **모두의연구소 / 모두의AI ecosystem** — https://modulabs.co.kr · Community-driven AI education; comparable/competitor mapping.
- **Naver 부스트코스 (Boostcourse)** — https://www.boostcourse.org · Free Korean MOOC platform with AI tracks; the free-tier alternative learners will compare us against.

---

## Part 7 — Merge notes

1. New count after merge: ~112 + ~45 ≈ **155+ entries**, exceeding the 100 target with room to prune.
2. Benchmarks category needs a **quarterly re-verify** rule (boards rebrand — LMArena→Arena in Jan 2026 is the cautionary example; HF Open LLM Leaderboard retirement is another).
3. §5.0 primer should graduate into curriculum Week 9 (verification) and the platform's knowledge base.
4. §6.4 doubles as competitor/partner mapping — GPTers and 모두의연구소 belong in the partner-strategy doc too.
5. Still open from v0.1: the four placeholders (worldvision, CTRL+ALT+DELETE, recon, gstack) and your private "many more" list.
