function getWhoogleBase(): string {
  const base =
    process.env.WHOOGLE_URL ||
    process.env.VITE_WHOOGLE_BASE ||
    process.env.VITE_WHOOGLE_URL ||
    "https://nerdvana-whoogle.onrender.com";
  return base.replace(/\/+$/, "");
}

export default async function handler(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    if (!q) {
      return Response.json({ results: [] }, { status: 200 });
    }

    const whoogleUrl = `${getWhoogleBase()}/search?q=${encodeURIComponent(q)}&format=json`;
    const upstream = await fetch(whoogleUrl, {
      method: "GET",
      headers: {
        "user-agent": "nerdvana-search-proxy/1.0"
      }
    });

    if (!upstream.ok) {
      return Response.json({ results: [] }, { status: 200 });
    }

    const payload = await upstream.json();
    const results = Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload)
        ? payload
        : [];

    return Response.json({ results }, { status: 200 });
  } catch {
    return Response.json({ results: [] }, { status: 200 });
  }
}
