# v3: Companies and About, and the inquiry form

Goal: the last two copy pages, written from Eric's brain dump, and a working inquiry form
that stores submissions where the team can read them.

## Sources and rules

- Eric's brain dump (2026-09-08): "We are originally product architects, founders, and
  engineers who use AI for the most difficult use cases and max out our subscription token
  limits on a daily basis... 10+ years experience in emerging tech... DX and AX... complex and
  difficult to build products, easy to use. Increasing efficiency and revenue."
- Verticals to name: logistics, law, media, technology, consulting, agencies, marketing,
  medical, pharmaceuticals, sales, entertainment, commerce, content creation.
- Lumberworks (lumberworks.xyz): the dev studio Eric is part of; credibility, not a client.
- No clients, logos, or case studies yet: those slots stay hidden.
- Team: Eric (co-founder, main instructor, product and curriculum), 김학범 Ted Kim (co-founder
  and CEO, sales and operations). Photos come in v4; initials until then.
- Story for About: the friend at OpenAI in 2019 (GPT-2 era), the researcher program for the
  GPT-3 API a year before ChatGPT, the team using AI daily since, the friends (founders,
  solopreneurs, lawyers, writers, finance, design, creators) who got tens of hours a week back
  and said "sell this or teach it", the research-papers line, co-founding with someone Eric
  first taught.
- 저희 when InnovLabs speaks to the customer; first-person story uses 저 / 제.
- Curriculum principles apply to the training copy: artifact evidence, browser-only path for
  corporate IT, nothing promised that can't be shown.

## The form

- Built into the site, no third party. The static page posts JSON to the funnel app's
  `POST /api/inquiry`, which validates, rate-limits lightly, and inserts into a new
  `inquiry` table in Supabase (anon insert only, no read policy; the team reads it in the
  Supabase dashboard until an admin view exists).
- Fields: name, company, role, email, interest (training / development / both), team size,
  message, plus a hidden honeypot. Consent line under the button (개인정보 수집 동의).
- The endpoint URL comes from `PUBLIC_INQUIRY_URL` at build time; the review deploy uses
  the droplet's funnel on port 3100. CORS allows the site origin.
- States: sending, sent (thank-you in place), failed (keep the text, show the KakaoTalk
  fallback).
- A migration file is added to `supabase/migrations/`; it must be applied to the Supabase
  project before the form can store anything. Until then the endpoint answers 503 and the
  form shows the failed state.

## Sections, Companies

Hero with two jump buttons; training (who it's for, formats table, what the team leaves
with, how it runs); consulting and development (offer, method, verticals, Lumberworks line);
team; the form.

## Sections, About

Hero; the story in four paragraphs; timeline; beliefs; team with "uses daily" lines; the
asterisk; CTA with the companies link.

## Open for Eric after review

- Apply the migration (or give me Supabase access to apply it).
- Confirm the verticals list and the Lumberworks line.
- Whether the executive session and department tracks are bookable now or "on request".
