export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt } = req.body;
    const apiKey = process.env.FAL_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

    // Use direct run endpoint instead of queue
    const runRes = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Key ' + apiKey
      },
      body: JSON.stringify({
        prompt: prompt,
        num_images: 1,
        image_size: 'portrait_4_3',
        num_inference_steps: 4
      })
    });

    const text = await runRes.text();
    console.log('fal response:', text.slice(0, 500));
    
    let data;
    try { data = JSON.parse(text); }
    catch(e) { return res.status(500).json({ error: 'Parse error: ' + text.slice(0, 200) }); }

    if (data.images && data.images[0]) {
      return res.status(200).json({ data: [{ url: data.images[0].url }] });
    }
    
    return res.status(500).json({ error: 'No image: ' + text.slice(0, 200) });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
