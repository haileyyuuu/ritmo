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

    const submitText = await submitRes.text();
    console.log('Submit raw:', submitText);
    
    let submitData;
    try { submitData = JSON.parse(submitText); } 
    catch(e) { return res.status(500).json({ error: 'Submit parse error: ' + submitText.slice(0, 200) }); }
    
    const requestId = submitData.request_id;
    if (!requestId) return res.status(500).json({ error: 'No request_id: ' + submitText.slice(0, 200) });

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra/requests/' + requestId, {
        headers: { 'Authorization': 'Key ' + apiKey }
      });
      const pollText = await pollRes.text();
      console.log('Poll raw:', pollText.slice(0, 300));
      
      let pollData;
      try { pollData = JSON.parse(pollText); }
      catch(e) { continue; }
      
      if (pollData.images && pollData.images[0]) {
        return res.status(200).json({ data: [{ url: pollData.images[0].url }] });
      }
      if (pollData.status === 'FAILED') {
        return res.status(500).json({ error: 'Generation failed' });
      }
    }
    return res.status(500).json({ error: 'Timeout' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
