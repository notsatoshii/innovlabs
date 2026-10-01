// Environment check for the running server (review findings P1-27, P1-28).
// Read by GET /api/health; the container healthcheck calls that within
// seconds of start, so a missing variable is in the logs with a sentence that
// says what breaks and where to set it. To run it at boot proper, call
// reportEnvOnce() from src/instrumentation.ts (register()).
//
// NEXT_PUBLIC_* values are inlined at BUILD time, so they are read with
// literal property access below (a computed name would not be inlined) and
// fixing one means rebuilding the image, not editing the running container.
// Values are never logged; only names.

export interface EnvProblem {
  name: string;
  /** error = something is broken for every user; warn = one feature is off. */
  level: "error" | "warn";
  message: string;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function checkEnv(): EnvProblem[] {
  const problems: EnvProblem[] = [];
  const add = (name: string, level: EnvProblem["level"], message: string) =>
    problems.push({ name, level, message });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  if (!supabaseUrl) {
    add(
      "NEXT_PUBLIC_SUPABASE_URL",
      "error",
      "is empty in this build. Nothing can reach the database. Set it in .env and rebuild (docker compose up -d --build).",
    );
  } else if (!isHttpUrl(supabaseUrl)) {
    add("NEXT_PUBLIC_SUPABASE_URL", "error", "is not a URL. Expected https://<project-ref>.supabase.co, then rebuild.");
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    add(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "error",
      "is empty in this build. Sign-in and the survey cannot work. Set it in .env and rebuild (docker compose up -d --build).",
    );
  }

  if (!process.env.SUPABASE_SECRET_KEY?.trim()) {
    add(
      "SUPABASE_SECRET_KEY",
      "error",
      "is not set. Registration, the inquiry form, the labs, the staff pages and the report all answer 503 without it. Add it to .env (server only) and restart the container.",
    );
  }

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    add(
      "ANTHROPIC_API_KEY",
      "warn",
      "is not set. The personalized report cannot be generated. Add it to .env and restart the container.",
    );
  }

  const origins = (process.env.INQUIRY_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (origins.length === 0) {
    add(
      "INQUIRY_ALLOWED_ORIGINS",
      "warn",
      "is not set. The marketing site's inquiry form is refused (403). Set it to the site's origin, e.g. https://innovlab.me, and restart the container.",
    );
  } else if (origins.some((o) => !isHttpUrl(o) || new URL(o).origin !== o.replace(/\/+$/, ""))) {
    add(
      "INQUIRY_ALLOWED_ORIGINS",
      "warn",
      "has an entry that is not a bare origin. Use scheme and host only, comma-separated, e.g. https://innovlab.me,https://www.innovlab.me.",
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  if (!siteUrl) {
    add(
      "NEXT_PUBLIC_SITE_URL",
      "warn",
      "is empty in this build. The consent screen has no link to the privacy policy. Set it in .env and rebuild.",
    );
  } else if (!isHttpUrl(siteUrl)) {
    add("NEXT_PUBLIC_SITE_URL", "warn", "is not a URL. Expected e.g. https://innovlab.me, then rebuild.");
  }

  return problems;
}

let reported: EnvProblem[] | null = null;

/** Check once per process and write each problem to the server log. */
export function reportEnvOnce(): EnvProblem[] {
  if (reported) return reported;
  reported = checkEnv();
  for (const p of reported) {
    const line = `[env] ${p.name} ${p.message}`;
    if (p.level === "error") console.error(line);
    else console.warn(line);
  }
  if (reported.length === 0) console.log("[env] all expected variables are present");
  return reported;
}
