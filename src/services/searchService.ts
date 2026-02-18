export async function fetchSearchResults(query: string) {
  const res = await fetch(
    `/api/search?q=${encodeURIComponent(query)}&format=json`
  );

  const data = await res.json();

  return (data.results || []).map((r: any) => ({
    title: r.text || "",
    url: r.href,
    snippet: r.text || "",
    source: new URL(r.href).hostname,
  }));
}
