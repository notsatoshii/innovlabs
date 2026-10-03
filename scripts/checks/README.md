# Signed-in checks against the real database

Small Node scripts that drive the dev server (`npm run dev -- -p 3005`) and the
Supabase project with disposable test accounts. They are the "Test" step of
`docs/app/phases/process.md` for anything that needs a session and real rows.
Not part of CI: they need `.env.local` and write to the database.

    DIR=$(mktemp -d)
    TAG=run$(date +%s)   # one tag per run; see "Parallel runs" below
    npx tsx scripts/test-session.ts learner --tag $TAG > $DIR/learner-cookie.txt
    npx tsx scripts/test-session.ts blank   --tag $TAG > $DIR/blank-cookie.txt
    npx tsx scripts/test-session.ts staff   --tag $TAG > $DIR/staff-cookie.txt

    # against the live site instead of the dev server: export CHECK_BASE=https://app.innovlab.me
    node scripts/checks/week2-labs.mjs $DIR                             # routes, caps, pages (run first)
    node scripts/checks/week2-labs-concurrency-and-privileges.mjs $DIR  # needs the rows the first one made
    node scripts/checks/evidence.mjs $DIR                               # storage policies, time log, signed URLs
    node scripts/checks/register-employee.mjs $DIR                      # turns the blank account into an employee learner
    node scripts/checks/week3-labs.mjs $DIR                             # 2c: Week 3 labs, lock/countersign, track, 0011 RLS and grants

`week3-labs.mjs` needs migration 0011 and the seeded templates. It sets up its
own state with the service role (resets the Week 3 rows of the learner and
blank accounts, gives the blank account a profile, makes a test cohort and
opens its Week 3 halfway) and deletes its cohort at the end. It needs no
earlier script, and it can run again on the same accounts.

Clean up afterwards, with the same tag. Deleting an account does not delete
its events (`profile_event.user_id` is set to null), so `cleanup` removes the
account's events and drafts by its user id first, then the account:

    npx tsx scripts/test-session.ts cleanup --tag $TAG

Never clean up with a `like '%@innovlabs.test'` filter: it deletes the rows
of every test account, including ones another run is using right now.

## Parallel runs

Two runs on the same accounts break each other. `test-session.ts` rotates
the account's password and signs it in again, which ends the other run's
browser session (its next submit lands on the login page); `week3-labs.mjs`
resets the Week 3 rows and enrollments of the accounts it is given; and a
cleanup deletes the other run's rows. So:

- Give every run its own `--tag` (a check script, each browser pass). A
  browser pass signs in with `test-session.ts learner --tag pass3` and so on.
- Give every run its own dev server port, and restart a dev server that
  starts answering 500 (for example a Jest worker crashing with EPIPE)
  before trusting any result from it. Results from a run that shared an
  account or an unhealthy server with another run are not evidence.

`register-employee.mjs` prints the id of the survey_response row it inserted;
delete that row and its `survey_completed` event by id. Cohorts made while
testing the staff pages are deleted by id as well (enrollment rows cascade).
The cookie files hold live session tokens for the test accounts: keep them in
a temp directory, never in the repo.
