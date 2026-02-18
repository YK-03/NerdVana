export default async function handler(req, res) {
  const q = req.query.q || "";

  const url = `https://nerdvana-whoogle.onrender.com/search?q=${encodeURIComponent(q)}&format=json`;

  const r = await fetch(url);
  const data = await r.json();

  res.status(200).json(data);
}
