export async function fetchSearchResults(query: string) {
  try {
    const url = `/api/search?q=${encodeURIComponent(query)}`;
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
