export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const key = process.env.FAL_API_KEY;
  if (!key) return res.status(500).json({ error: 'No key' });
  return res.status(200).json({ key });
}
