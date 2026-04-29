export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { sentence } = req.body;
  if (!sentence || typeof sentence !== "string" || sentence.trim().length === 0) {
    return res.status(400).json({ error: "Please provide a valid sentence." });
  }

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured on server." });
  }

  const systemPrompt = `You are an expert NLP system specializing in Aspect Sentiment Triplet Extraction (ASTE).
Given a sentence, extract all sentiment triplets in the form (aspect, opinion, polarity).

Rules:
- "aspect" is the entity or attribute being discussed (e.g., "battery life", "food", "service")
- "opinion" is the sentiment expression about the aspect (e.g., "amazing", "terrible", "slow")
- "polarity" must be exactly one of: "positive", "negative", or "neutral"
- Extract ALL triplets present in the sentence
- The "aspect" and "opinion" values must be exact substrings from the original sentence (preserve original casing and spacing)
- If no clear aspect-opinion pair exists, return an empty array

Respond ONLY with a valid JSON object, no markdown, no explanation, no preamble:
{
  "triplets": [
    { "aspect": "...", "opinion": "...", "polarity": "positive" | "negative" | "neutral" }
  ]
}`;

  try {
    const response = await fetch(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "qwen3-235b-a22b-instruct-2507",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Sentence: "${sentence.trim()}"` },
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("DashScope error:", errText);
      return res.status(502).json({ error: "LLM API request failed.", detail: errText });
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content || "";

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json|```/gi, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Attempt to extract JSON substring if model included extra text
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        return res.status(500).json({ error: "Could not parse model response.", raw });
      }
    }

    return res.status(200).json({ triplets: parsed.triplets || [] });
  } catch (err) {
    console.error("Extract error:", err);
    return res.status(500).json({ error: "Internal server error.", detail: err.message });
  }
}
