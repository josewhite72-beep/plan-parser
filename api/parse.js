export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body;
  if (!text || text.trim().length < 20) {
    return res.status(400).json({ error: 'Text too short or missing' });
  }

  const prompt = `You are an expert in Panama's MEDUCA English curriculum and the Activity-Oriented Approach (AOA).

Analyze this lesson plan and extract the key elements needed to generate an AOA comic strip.

LESSON PLAN TEXT:
"""
${text.slice(0, 4000)}
"""

Return ONLY a valid JSON object. No markdown, no code fences, no extra text.

{
  "topic": "main theme/topic in 3-6 words (in English)",
  "grade": "one of: Pre-K / Kinder | Grade 1-2 | Grade 3-4 | Grade 5-6",
  "vocabulary": ["word1", "word2", "word3", "word4", "word5"],
  "targetStructure": "the exact grammatical structure being taught, e.g. 'Can you...? Yes, I can / No, I can't'",
  "communicativeFunction": "what students do with the language, e.g. 'asking about abilities', 'describing locations'",
  "hook": "a warm-up question or scenario to activate prior knowledge (1 sentence)",
  "expectedOutcome": "what students will be able to do after the lesson (1 sentence starting with 'Students will be able to...')",
  "phase": "most likely AOA phase for a comic: Warm-up | Presentation | Practice | Reading",
  "context": "2-3 sentence summary combining topic, structure, vocabulary and function — ready to paste into a comic generator prompt"
}

Rules:
- All values in English
- vocabulary: 5-8 words maximum, only the new target words
- If a field cannot be determined from the text, use null
- Be specific and concise`;

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'DeepSeek error' });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
