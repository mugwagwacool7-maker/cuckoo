const express = require('express');
const cors = require('cors');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const BOOKINGS_DIR = path.join(__dirname, 'data');
const BOOKINGS_FILE = path.join(BOOKINGS_DIR, 'bookings.json');
const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY = 12;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

app.use(cors());
app.use(express.json());

const SYSTEM_INSTRUCTION = [
  "You are Cuckoo Safaris' friendly travel assistant. Help visitors plan trips, especially Victoria Falls and African safaris.",
  'Be warm, clear, and concise. Do not invent prices, availability, or booking details.',
  "Answer the visitor's latest question directly using the conversation history. Do not repeat a previous answer or fall back to a generic response unless the visitor asks for a recap.",
  'Format replies for a small chat window: short paragraphs and simple bullet or numbered lists. Avoid tables, code blocks, and decorative symbols.',
  'You can create a booking request for a client with the create_booking tool.',
  'Workflow for bookings:',
  '1. Understand which trip or package the client wants.',
  '2. Collect these required details: full name, email address, travel date (YYYY-MM-DD), destination or trip, and number of travelers. Phone number is optional but useful.',
  '3. Summarise the details back to the client and ask them to confirm.',
  '4. Only call create_booking after the client explicitly confirms. If they already provided every detail and clearly asked to book, you may call it immediately.',
  '5. After a successful booking, give the booking reference and explain that the team will confirm availability and payment details. Never claim a booking is paid or guaranteed.',
  'If the tool reports a problem, apologise and ask for the missing or corrected details, or suggest contacting the Cuckoo Safaris team.',
].join(' ');

const BOOKING_TOOL = {
  functionDeclarations: [
    {
      name: 'create_booking',
      description:
        'Create a booking request for the client. Only call this after collecting the full name, email, travel date (YYYY-MM-DD), destination or trip, and number of travelers, and after the client has explicitly confirmed they want to book. Never use this tool to check prices or availability.',
      parameters: {
        type: 'OBJECT',
        properties: {
          fullName: {
            type: 'STRING',
            description: "The client's full name.",
          },
          email: {
            type: 'STRING',
            description: "The client's email address for booking confirmation.",
          },
          phone: {
            type: 'STRING',
            description: "The client's phone or WhatsApp number, including country code if possible.",
          },
          travelDate: {
            type: 'STRING',
            description: 'Preferred travel date in YYYY-MM-DD format.',
          },
          destination: {
            type: 'STRING',
            description: 'Destination or trip the client wants to book, for example Victoria Falls or Chobe National Park.',
          },
          packageName: {
            type: 'STRING',
            description: 'Optional safari package or tour name.',
          },
          travelers: {
            type: 'INTEGER',
            description: 'Number of travelers, between 1 and 50.',
          },
          specialRequests: {
            type: 'STRING',
            description: 'Optional special requests such as dietary needs, accessibility, or celebrations.',
          },
        },
        required: ['fullName', 'email', 'travelDate', 'destination', 'travelers'],
      },
    },
  ],
};

let bookingWriteChain = Promise.resolve();

async function readBookings() {
  try {
    const raw = await fs.readFile(BOOKINGS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function generateReference() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CS-${date}-${suffix}`;
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeBooking(input) {
  const details = input && typeof input === 'object' ? input : {};
  const fullName = cleanText(details.fullName, 120);
  const email = cleanText(details.email, 160).toLowerCase();
  const phone = cleanText(details.phone, 40);
  const travelDate = cleanText(details.travelDate, 10);
  const destination = cleanText(details.destination, 160);
  const packageName = cleanText(details.packageName, 160);
  const specialRequests = cleanText(details.specialRequests, 600);
  const travelers = Number(details.travelers);

  const errors = [];

  if (fullName.length < 2) errors.push('fullName');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) {
    errors.push('travelDate');
  } else {
    const parsedDate = new Date(`${travelDate}T00:00:00Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate < today) errors.push('travelDate');
  }
  if (destination.length < 2) errors.push('destination');
  if (!Number.isInteger(travelers) || travelers < 1 || travelers > 50) errors.push('travelers');

  return {
    errors,
    booking: {
      fullName,
      email,
      phone: phone || null,
      travelDate,
      destination,
      packageName: packageName || null,
      travelers,
      specialRequests: specialRequests || null,
    },
  };
}

function saveBooking(booking, source = 'ai-assistant') {
  const task = bookingWriteChain.then(async () => {
    const bookings = await readBookings();
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const duplicate = bookings.find((entry) =>
      entry.email &&
      entry.email.toLowerCase() === booking.email &&
      entry.travelDate === booking.travelDate &&
      typeof entry.destination === 'string' &&
      entry.destination.toLowerCase() === booking.destination.toLowerCase() &&
      new Date(entry.createdAt).getTime() >= tenMinutesAgo
    );

    if (duplicate) return duplicate;

    const record = {
      id: crypto.randomUUID(),
      reference: generateReference(),
      ...booking,
      status: 'pending',
      source,
      createdAt: new Date().toISOString(),
    };

    bookings.push(record);
    await fs.mkdir(BOOKINGS_DIR, { recursive: true });
    await fs.writeFile(BOOKINGS_FILE, `${JSON.stringify(bookings, null, 2)}\n`, 'utf8');
    return record;
  });

  bookingWriteChain = task.catch(() => {});
  return task;
}

async function callGemini(contents) {
  const response = await fetch(`${GEMINI_ENDPOINT}/${encodeURIComponent(MODEL)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents,
      tools: [BOOKING_TOOL],
      generationConfig: {
        maxOutputTokens: 700,
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Gemini returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }

  return response.json();
}

function getContent(result) {
  return result?.candidates?.[0]?.content || null;
}

function getText(content) {
  if (!Array.isArray(content?.parts)) return '';
  return content.parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

function getFunctionCall(content) {
  if (!Array.isArray(content?.parts)) return null;
  const part = content.parts.find((item) => item?.functionCall);
  return part ? part.functionCall : null;
}

async function createBookingFromTool(args) {
  const { errors, booking } = normalizeBooking(args);

  if (errors.length > 0) {
    return {
      success: false,
      error: `These details are missing or invalid: ${errors.join(', ')}. Ask the client to provide or correct them before booking.`,
    };
  }

  const saved = await saveBooking(booking);

  return {
    success: true,
    bookingReference: saved.reference,
    status: saved.status,
    message:
      'Booking request created. The Cuckoo Safaris team will confirm availability and payment details with the client.',
  };
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Cuckoo Safaris API' });
});

app.post('/api/bookings', async (req, res) => {
  const { errors, booking } = normalizeBooking(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      error: `These details are missing or invalid: ${errors.join(', ')}.`,
      fields: errors,
    });
  }

  try {
    const saved = await saveBooking(booking, 'website');
    return res.status(201).json({
      reference: saved.reference,
      status: saved.status,
      createdAt: saved.createdAt,
    });
  } catch (error) {
    console.error('Failed to save booking:', error);
    return res.status(500).json({ error: 'The booking could not be saved. Please try again.' });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body || {};
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  if (!trimmedMessage || trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: 'Message must be between 1 and 1000 characters.' });
  }

  if (history !== undefined && !Array.isArray(history)) {
    return res.status(400).json({ error: 'Conversation history must be a list of messages.' });
  }

  const conversation = (history || []).slice(-MAX_HISTORY);
  if (conversation.some((entry) =>
    !entry ||
    !['user', 'model'].includes(entry.role) ||
    typeof entry.text !== 'string' ||
    !entry.text.trim() ||
    entry.text.length > MAX_MESSAGE_LENGTH
  )) {
    return res.status(400).json({ error: 'Conversation history contains an invalid message.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'The assistant is not configured yet. Add GEMINI_API_KEY to the backend environment.' });
  }

  const contents = [
    ...conversation.map(({ role, text }) => ({
      role,
      parts: [{ text: text.trim() }],
    })),
    { role: 'user', parts: [{ text: trimmedMessage }] },
  ];

  let result;
  try {
    result = await callGemini(contents);
  } catch (error) {
    console.error('Gemini request failed:', error);
    return res.status(502).json({ error: 'The assistant could not be reached. Please try again.' });
  }

  let content = getContent(result);
  let functionCall = getFunctionCall(content);

  if (functionCall && functionCall.name === 'create_booking') {
    let toolResponse;

    try {
      toolResponse = await createBookingFromTool(functionCall.args || {});
    } catch (error) {
      console.error('Failed to create booking:', error);
      toolResponse = {
        success: false,
        error: 'The booking could not be saved right now. Ask the client to try again in a moment or contact the Cuckoo Safaris team.',
      };
    }

    const followUpContents = [
      ...contents,
      { role: 'model', parts: content.parts },
      {
        role: 'user',
        parts: [{ functionResponse: { name: functionCall.name, response: toolResponse } }],
      },
    ];

    try {
      result = await callGemini(followUpContents);
    } catch (error) {
      console.error('Gemini follow-up request failed:', error);
      if (toolResponse.success) {
        return res.json({
          reply: `Your booking request has been received. Your reference is ${toolResponse.bookingReference}. Our team will contact you to confirm availability and payment details.`,
          bookingReference: toolResponse.bookingReference,
        });
      }
      return res.status(502).json({ error: 'The assistant could not finish the booking. Please try again.' });
    }

    content = getContent(result);
    functionCall = getFunctionCall(content);

    if (functionCall) {
      if (toolResponse.success) {
        return res.json({
          reply: `Your booking request has been received. Your reference is ${toolResponse.bookingReference}. Our team will contact you to confirm availability and payment details.`,
          bookingReference: toolResponse.bookingReference,
        });
      }
      return res.status(502).json({ error: 'The assistant could not finish the booking. Please try again.' });
    }
  }

  const reply = getText(content);

  if (!reply) {
    console.error('Gemini response did not contain a text reply.');
    return res.status(502).json({ error: 'The assistant could not answer that just now. Please try again.' });
  }

  return res.json({ reply });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
