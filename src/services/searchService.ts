export async function fetchSearchResults(query: string) {
  const whoogleBase =
    import.meta.env.VITE_WHOOGLE_BASE ||
    import.meta.env.VITE_WHOOGLE_URL ||
    "https://nerdvana-whoogle.onrender.com";

  try {
    const url = `${whoogleBase.replace(/\/+$/, "")}/search?q=${encodeURIComponent(query)}&format=json`;
    console.log("[Nerdvana] Whoogle request:", url);
    const res = await fetch(url);
    if (!res.ok) {
      console.error("[Nerdvana] Whoogle fetch failed");
      return [];
    }

    const data = await res.json();
    const rows = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

    return rows.map((r: any) => {
      const targetUrl = r?.href || r?.url || r?.link || "";
      let source = "";
      if (targetUrl) {
        try {
          source = new URL(targetUrl).hostname;
        } catch {
          source = "";
        }
      }

      return {
        title: r?.title || r?.text || "",
        url: targetUrl,
        snippet: r?.snippet || r?.text || r?.content || "",
        source,
      };
    });
  } catch {
    console.error("[Nerdvana] Whoogle fetch failed");
    return [];
  }
}
