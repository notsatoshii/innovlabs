# InnovLabs

Two apps in one repo, both deployed to one DigitalOcean droplet:

- **Funnel and learner app** (repo root, `src/`): Next.js 16 App Router + Supabase. Survey, registration,
  track one-pager, labs, staff pages, online course. Live at https://app.innovlab.me.
- **Marketing site** (`site/`): Astro, static. Live at https://innovlab.me.

Run locally (Node 22):

    npm ci && npm run dev                      # app on http://localhost:3000 (needs .env.local, see .env.example)
    npm --prefix site ci && npm --prefix site run dev   # site on http://localhost:4321

Checks: `npm run lint`, `npx tsc --noEmit`, `npx tsx scripts/course/score-selftest.ts`,
`npx tsx scripts/checks/week3-rules.ts`, `npm --prefix site run build` (CI runs these).

- Product spec: `survey_schema_v1_1.md`. Phase plans and status: `docs/app/phases/README.md`.
- Deploy, rollback, environment: [deploy/DEPLOY.md](deploy/DEPLOY.md).
- Signed-in checks against the real database: [scripts/checks/README.md](scripts/checks/README.md).
