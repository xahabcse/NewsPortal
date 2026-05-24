// Google Gemini wrapper — used by /api/v1/ai/summarize and friends.
// We use the REST API directly so we don't need an SDK.

const MODEL = 'gemini-2.5-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

async function call(prompt: string, apiKey: string, opts: { maxOutputTokens?: number } = {}): Promise<string | null> {
  if (!apiKey) return null;
  try {
    const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: opts.maxOutputTokens ?? 256,
          temperature: 0.4,
        },
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    return json.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

export async function summarize(apiKey: string, text: string, mode: 'paragraph' | 'bullets' = 'paragraph'): Promise<string | null> {
  if (!text) return null;
  const prompt =
    mode === 'bullets'
      ? `Summarize the following article in 3-5 short bullet points. Output only the bullets, no preface.\n\n${text.slice(0, 8000)}`
      : `Write a concise 2-3 sentence summary of the following article. Output only the summary.\n\n${text.slice(0, 8000)}`;
  return call(prompt, apiKey, { maxOutputTokens: 320 });
}

export async function translate(apiKey: string, text: string, targetLang: string): Promise<string | null> {
  if (!text) return null;
  const prompt = `Translate the following text into ${targetLang}. Output only the translation, no commentary.\n\n${text.slice(0, 6000)}`;
  return call(prompt, apiKey, { maxOutputTokens: 800 });
}

export async function sentimentBatch(apiKey: string, comments: string[]): Promise<{ positive: number; negative: number; neutral: number } | null> {
  if (!comments.length) return { positive: 0, negative: 0, neutral: 0 };
  const text = comments.slice(0, 40).map((c, i) => `${i + 1}. ${c.slice(0, 240)}`).join('\n');
  const prompt = `Classify each numbered comment below as positive, negative, or neutral. Output a JSON object exactly like {"positive": N, "negative": N, "neutral": N} with the counts.\n\n${text}`;
  const raw = await call(prompt, apiKey, { maxOutputTokens: 80 });
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return {
      positive: parsed.positive ?? 0,
      negative: parsed.negative ?? 0,
      neutral: parsed.neutral ?? 0,
    };
  } catch {
    return null;
  }
}
