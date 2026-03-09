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

    const submitRes = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Key ' + apiKey
      },
      body: JSON.stringify({
        prompt: prompt,
        num_images: 1,
        aspect_ratio: '4:5',
        output_format: 'jpeg',
        safety_tolerance: '5'
      })
    });

    const submitData = await submitRes.json();
    const requestId = submitData.request_id;

    if (!requestId) return res.status(500).json({ error: 'Failed to submit job' });

    let result = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(`https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra/requests/${requestId}`, {
        headers: { 'Authorization': 'Key ' + apiKey }
      });
      const pollData = await pollRes.json();
      if (pollData.status === 'COMPLETED' || pollData.images) {
        result = pollData;
        break;
      }
      if (pollData.status === 'FAILED') {
        return res.status(500).json({ error: 'Image generation failed' });
      }
    }

    if (!result || !result.images || !result.images[0]) {
      return res.status(500).json({ error: 'Timeout or no image returned' });
    }

    return res.status(200).json({
      data: [{ url: result.images[0].url }]
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
