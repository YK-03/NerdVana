export async function fetchSearchResults(query: string) {
  try {
    const url = `/api/search?q=${encodeURIComponent(query)}`;
    console.log("[Nerdvana] Search request:", url);

    const res = await fetch(url);
    if (!res.ok) {
      console.error("[Nerdvana] Search fetch failed");
      return [];
    }

    const data = await res.json();
    console.log("SERPER RAW RESPONSE:", data);

    const rows = Array.isArray(data) ? data : [];

    return rows.map((r: any) => {
      const targetUrl = r?.url || "";

      let source = "";
      if (targetUrl) {
        try {
          source = new URL(targetUrl).hostname;
        } catch {
          source = "";
        }
      }

      return {
        title: r?.title || "",
        url: targetUrl,
        snippet: r?.snippet || "",
        source,
      };
    });
  } catch (e) {
    console.error("[Nerdvana] Search fetch failed:", e);
    return [];
  }
}
