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
    
    // Log for debugging
    console.log('Submit response:', JSON.stringify(submitData));
    
    const requestId = submitData.request_id;
    if (!requestId) return res.status(500).json({ error: 'No request_id: ' + JSON.stringify(submitData) });

    let result = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(`https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra/requests/${requestId}`, {
        headers: { 'Authorization': 'Key ' + apiKey }
      });
      const pollData = await pollRes.json();
      console.log('Poll response:', JSON.stringify(pollData));
      
      if (pollData.images && pollData.images.length > 0) {
        result = pollData;
        break;
      }
      if (pollData.status === 'COMPLETED') {
        result = pollData;
        break;
      }
      if (pollData.status === 'FAILED') {
        return res.status(500).json({ error: 'Generation failed: ' + JSON.stringify(pollData) });
      }
    }

    if (!result) return res.status(500).json({ error: 'Timeout' });

    // Try different response structures
    const imageUrl = 
      result?.images?.[0]?.url ||
      result?.image?.url ||
      result?.output?.[0] ||
      result?.url;

    if (!imageUrl) return res.status(500).json({ error: 'No image URL in: ' + JSON.stringify(result) });

    return res.status(200).json({ data: [{ url: imageUrl }] });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
