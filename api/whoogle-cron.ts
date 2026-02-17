const DEFAULT_PING_QUERY = "nerdvana";
const IST_OFFSET_MINUTES = 330;
const ACTIVE_START_IST_MINUTES = 10 * 60; // 10:00
const ACTIVE_END_IST_MINUTES = 23 * 60; // 23:00

function getWhoogleBaseUrl(): string | null {
  const value = process.env.WHOOGLE_URL || process.env.VITE_WHOOGLE_URL;
  if (!value) return null;
  return value.replace(/\/+$/, "");
}

function getIstMinutes(now: Date): number {
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return (utcMinutes + IST_OFFSET_MINUTES) % (24 * 60);
}

function isWithinActiveIstHours(now: Date): boolean {
  const istMinutes = getIstMinutes(now);
  return istMinutes >= ACTIVE_START_IST_MINUTES && istMinutes <= ACTIVE_END_IST_MINUTES;
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

async function pingWhoogle(baseUrl: string): Promise<{ status: number; ok: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `${baseUrl}/search?q=${encodeURIComponent(DEFAULT_PING_QUERY)}&format=json`;
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "user-agent": "nerdvana-vercel-cron/1.0"
      }
    });

    return { status: response.status, ok: response.ok };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return Response.json({ error: "Method Not Allowed" }, { status: 405 });
  }

  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const whoogleBaseUrl = getWhoogleBaseUrl();
  if (!whoogleBaseUrl) {
    return Response.json(
      { error: "Missing WHOOGLE_URL (or VITE_WHOOGLE_URL fallback)" },
      { status: 500 }
    );
  }

  const now = new Date();
  if (!isWithinActiveIstHours(now)) {
    return Response.json(
      {
        ok: true,
        skipped: true,
        reason: "Outside active IST hours (10:00-23:00)"
      },
      { status: 200 }
    );
  }

  try {
    const result = await pingWhoogle(whoogleBaseUrl);
    return Response.json(
      {
        ok: result.ok,
        whoogleStatus: result.status,
        whoogleBaseUrl
      },
      { status: result.ok ? 200 : 502 }
    );
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: "Whoogle ping failed",
        details: String(error?.message ?? "Unknown error")
      },
      { status: 502 }
    );
  }
}
