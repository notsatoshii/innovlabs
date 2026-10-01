// Request helpers for the public-facing write routes (/api/inquiry,
// /api/inquiry/consult, /api/register). The underscore folder keeps this out
// of routing. Nothing here touches the database.

/**
 * Address of the caller as the reverse proxy saw it.
 *
 * The LAST entry of X-Forwarded-For is the one our own proxy appended; any
 * earlier entries arrived with the request and can be invented by the client.
 * Caddy (production) drops client-supplied values and sends exactly one.
 * If the app port is ever published without a proxy in front, this header is
 * fully client-controlled; the global limiter below is the backstop for that.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last.slice(0, 64);
  }
  return req.headers.get("x-real-ip")?.trim().slice(0, 64) || "unknown";
}

/**
 * Small in-memory sliding-window limiter (per server instance; the app runs
 * as one container). Every attempt counts, not only successful ones, and old
 * keys are swept so the map cannot grow without bound.
 */
export function createRateLimiter(opts: { windowMs: number; limit: number; maxKeys?: number }) {
  const { windowMs, limit } = opts;
  const maxKeys = opts.maxKeys ?? 5000;
  const hits = new Map<string, number[]>();
  let lastSweep = Date.now();

  /** true = allowed (and counted); false = over the limit. */
  return function take(key: string): boolean {
    const now = Date.now();
    if (now - lastSweep > windowMs) {
      for (const [k, times] of hits) {
        if (times.every((t) => now - t >= windowMs)) hits.delete(k);
      }
      lastSweep = now;
    }
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    // Hard ceiling: drop the oldest keys (Map keeps insertion order).
    while (hits.size > maxKeys) {
      const oldest = hits.keys().next().value;
      if (oldest === undefined) break;
      hits.delete(oldest);
    }
    return true;
  };
}

/** `Content-Type: application/json` (with or without a charset). */
export function isJsonRequest(req: Request): boolean {
  const type = req.headers.get("content-type") ?? "";
  return type.split(";")[0].trim().toLowerCase() === "application/json";
}

/**
 * Same-origin check for the cookie-authenticated routes. Browsers send
 * Origin on every POST; it must name the host this request was addressed to
 * (the forwarded host behind the proxy). A missing or foreign Origin is
 * refused, so another site cannot post with a learner's cookies.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host.split(",")[0].trim();
  } catch {
    return false;
  }
}

export type JsonBody =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; reason: "too_large" | "bad_json" };

/** Read a JSON object body with a byte cap, before anything is parsed. */
export async function readJsonBody(req: Request, maxBytes: number): Promise<JsonBody> {
  // Refuse on the declared length first so an oversized body is never
  // buffered. (Bodies without a length are capped by the proxy; see
  // deploy/Caddyfile.example, request_body max_size.)
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, reason: "too_large" };
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return { ok: false, reason: "bad_json" };
  }
  if (new TextEncoder().encode(raw).length > maxBytes) return { ok: false, reason: "too_large" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "bad_json" };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: "bad_json" };
  }
  return { ok: true, body: parsed as Record<string, unknown> };
}
