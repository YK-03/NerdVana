console.log("SERPER KEY:", process.env.SERPER_API_KEY);
export default async function handler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    console.log("[Nerdvana] Serper request:", q);

    const r = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q,
        gl: "in",
        hl: "en",
      }),
    });

    const data = await r.json();

    const rows = Array.isArray(data?.organic) ? data.organic : [];

    const results = rows.map((r: any) => ({
      title: r.title || "",
      url: r.link || "",
      snippet: r.snippet || "",
      source: (() => {
        try {
          return new URL(r.link).hostname;
        } catch {
          return "";
        }
      })(),
    }));

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[Nerdvana] Serper error:", e);

    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
