// Run a SQL file or a one-off statement against the Supabase Postgres
// (SUPABASE_DB_URL in .env.local, server-only, never committed).
//
//   npx tsx scripts/db.ts --file supabase/migrations/0004_app_phase1.sql
//   npx tsx scripts/db.ts --sql "select count(*) from public.user_profile"
//
// The connection string is never printed. Errors show the Postgres message
// only.

import { readFileSync } from "node:fs";
import { Client } from "pg";

function loadEnvLocal(): void {
  let raw = "";
  try {
    raw = readFileSync(".env.local", "utf8");
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

async function main(): Promise<void> {
  loadEnvLocal();
  const url = process.env.SUPABASE_DB_URL;
  if (!url || url.includes("[YOUR-PASSWORD]")) {
    console.error("SUPABASE_DB_URL is missing or still has the placeholder password.");
    process.exit(2);
  }

  const args = process.argv.slice(2);
  const fileIdx = args.indexOf("--file");
  const sqlIdx = args.indexOf("--sql");
  const sql =
    fileIdx >= 0 ? readFileSync(args[fileIdx + 1], "utf8") : sqlIdx >= 0 ? args[sqlIdx + 1] : null;
  if (!sql) {
    console.error("usage: --file <path.sql> | --sql <statement>");
    process.exit(2);
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    if (fileIdx >= 0) {
      // Migrations run as one transaction: all or nothing.
      await client.query("begin");
      await client.query(sql);
      await client.query("commit");
      console.log(`applied ${args[fileIdx + 1]}`);
    } else {
      const res = await client.query(sql);
      console.log(JSON.stringify(res.rows, null, 2));
    }
  } catch (e) {
    await client.query("rollback").catch(() => undefined);
    console.error("db error:", (e as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

void main();
