const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const PRIMARY_MODEL = (process.env.GEMINI_MODEL || 'gemini-3.5-flash').replace(/^models\//, '');
const FALLBACK_MODEL = (process.env.GEMINI_FALLBACK_MODEL || 'gemini-flash-latest').replace(/^models\//, '');
const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY = 12;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export const config = {
  maxDuration: 60,
};

const SYSTEM_INSTRUCTION = [
  "You are Cuckoo Safaris' friendly travel assistant. Cuckoo Safaris is based in Victoria Falls, Zimbabwe.",
  'Help visitors plan trips across Victoria Falls, Chobe National Park, Hwange, Matobo and multi-country Southern Africa safaris.',
  'Be warm, clear and concise. Format replies for a small chat window with short paragraphs and simple bullet or numbered lists.',
  "Answer the visitor's latest question directly using the conversation history. Do not repeat a previous answer or fall back to a generic response unless the visitor asks for a recap.",
  'Do not use tables, code blocks or decorative symbols.',
  'Popular trips include: Victoria Falls Day Tour; 4-Day Victoria Falls & Chobe Safari; 5-Day Family Safari: Victoria Falls & Chobe; 3-Day Chobe National Park Safari; 6-Day Botswana Highlights Camping Safari; 7-Day Zimbabwe Highlights: Victoria Falls, Hwange & Matobo; 10-Day Zimbabwe Heritage & Wildlife Safari; and 12-Day Zimbabwe, Botswana & Zambia Explorer.',
  'Never invent prices, availability, discounts, inclusions or booking confirmations. Prices on the website are indicative and must be confirmed by the Cuckoo Safaris team.',
  'You cannot create or confirm a booking yourself. When a visitor wants to book, direct them to the Book Now form at /contact.html#Contact, WhatsApp +263 712 154 201, or email info@cuckoosafaris.com.',
  'If you are unsure about something, say so honestly and suggest contacting the team.',
  'Keep replies focused on travel, safaris and Cuckoo Safaris services. Politely redirect unrelated questions.',
].join(' ');

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function cleanHistory(history) {
  if (history === undefined) return { history: [] };
  if (!Array.isArray(history)) return { error: 'Conversation history must be a list of messages.' };

  const cleaned = history.slice(-MAX_HISTORY);
  const invalid = cleaned.some(
    (entry) =>
      !entry ||
      !['user', 'model'].includes(entry.role) ||
      typeof entry.text !== 'string' ||
      !entry.text.trim() ||
      entry.text.length > MAX_MESSAGE_LENGTH,
  );

  if (invalid) return { error: 'Conversation history contains an invalid message.' };
  return { history: cleaned };
}

function getText(result) {
  const parts = result?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(apiKey, contents, model) {
  const response = await fetch(
    `${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents,
        generationConfig: {
          maxOutputTokens: 700,
          temperature: 0.7,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: AbortSignal.timeout(30000),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const requestError = new Error(`Gemini returned HTTP ${response.status}`);
    requestError.status = response.status;
    requestError.detail = detail.slice(0, 300);
    throw requestError;
  }

  return response.json();
}

async function generateReply(apiKey, contents) {
  const models = [PRIMARY_MODEL];
  if (FALLBACK_MODEL && FALLBACK_MODEL !== PRIMARY_MODEL) models.push(FALLBACK_MODEL);

  let lastError;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await callGemini(apiKey, contents, model);
        const reply = getText(result);
        if (reply) return reply;
        lastError = new Error('Gemini response did not contain a text reply.');
        break;
      } catch (requestError) {
        lastError = requestError;
        const canRetry = RETRYABLE_STATUSES.has(requestError.status) && attempt === 0;
        if (!canRetry) break;
        await delay(600);
      }
    }
  }

  throw lastError || new Error('Gemini did not return a reply.');
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method not allowed.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body && typeof body === 'object' ? body : {};

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    send(res, 400, { error: 'Message must be between 1 and 1000 characters.' });
    return;
  }

  const { history, error } = cleanHistory(body.history);
  if (error) {
    send(res, 400, { error });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    send(res, 503, { error: 'The assistant is not configured yet.' });
    return;
  }

  const contents = [
    ...history.map(({ role, text }) => ({
      role,
      parts: [{ text: text.trim() }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  try {
    const reply = await generateReply(apiKey, contents);
    send(res, 200, { reply });
  } catch (requestError) {
    console.error('Gemini request failed:', requestError);
    send(res, 502, { error: 'The assistant could not be reached. Please try again.' });
  }
}
