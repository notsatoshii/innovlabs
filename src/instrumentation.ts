// Report missing or malformed environment variables once at server start, so
// a bad deploy shows up in the first log lines rather than on the first
// request that needs the variable.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reportEnvOnce } = await import("@/app/api/health/_lib/env");
    reportEnvOnce();
  }
}
