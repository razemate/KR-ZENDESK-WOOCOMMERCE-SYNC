import OpenAI from 'openai';
import { json } from "../lib/utils.js";

// Initialize OpenAI
// Note: Vercel will need OPENAI_API_KEY in Environment Variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    // 1. Method Check
    if (req.method !== "POST") {
      return json(res, 405, { ok: false, error: "Method Not Allowed" });
    }

    // 2. Parse Body
    const { ticketContent, promptType } = req.body || {};

    if (!ticketContent) {
      return json(res, 400, { ok: false, error: "Missing ticket content" });
    }

    // 3. Construct Prompt
    const systemPrompt = `You are a helpful customer support assistant for Katusa Research.
Your tone should be professional, concise, and helpful.
You are replying to a customer email.`;

    let userPrompt = `Here is the customer's email content:\n\n"${ticketContent}"\n\n`;

    if (promptType === "summarize") {
      userPrompt += "Please provide a brief 2-sentence summary of what the customer is asking.";
    } else {
      userPrompt += "Please draft a polite and professional reply to this email. Address their concerns directly.";
    }

    // 4. Call OpenAI
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "gpt-4o-mini", // Using 4o-mini for speed and cost
    });

    const reply = completion.choices[0].message.content;

    // 5. Return Result
    return json(res, 200, { ok: true, reply });

  } catch (e) {
    console.error("AI Error:", e);
    return json(res, 500, { ok: false, error: e.message || "AI Service Error" });
  }
}
