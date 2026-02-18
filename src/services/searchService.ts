export async function fetchSearchResults(query: string) {
  const whoogleBase =
    import.meta.env.VITE_WHOOGLE_BASE || "https://nerdvana-whoogle.onrender.com";

  try {
    const encodedQuery = encodeURIComponent(query);
    const res = await fetch(`${whoogleBase}/search?q=${encodedQuery}`);
    if (!res.ok) {
      console.error("[Nerdvana] Whoogle fetch failed");
      return [];
    }

    const data = await res.json();
    const rows = Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
        ? data.results
        : [];

    return rows.map((r: any) => {
      const url = r?.href || r?.url || r?.link || "";
      let source = "";
      if (url) {
        try {
          source = new URL(url).hostname;
        } catch {
          source = "";
        }
      }

      return {
        title: r?.title || r?.text || "",
        url,
        snippet: r?.snippet || r?.content || r?.description || r?.text || "",
        source,
      };
    });
  } catch {
    console.error("[Nerdvana] Whoogle fetch failed");
    return [];
  }
}
