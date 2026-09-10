import OpenAI from 'openai';
import supabase from '../supabase.js';
import * as dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'mock-key'
});

/**
 * Answers inbound WhatsApp queries about bills using OpenAI and Supabase context
 */
export async function generateAIResponse(userMessage, senderNumber) {
  try {
    const { data: bills, error } = await supabase
      .from('bills')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching bills for OpenAI context:', error);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const systemPrompt = `You are an automated Bill Assistant for CTI HRMS.
Your job is to answer user queries about pending bills, upcoming due dates, payment status, or overdue bills concisely and politely.

CURRENT DATABASE BILLS:
${JSON.stringify(bills || [], null, 2)}

Today's Date: ${todayStr} (Asia/Kolkata)

INSTRUCTIONS:
1. Provide short, readable WhatsApp responses using clear formatting and emojis (e.g. 📄, 💰, 📅, ✅).
2. If asked "what's due this week?", "what bills are pending?", or "show overdue bills", filter the list above and list bill names, amounts (in INR ₹), and due dates.
3. If no bills match, state warmly that all bills in that category are paid up!
4. Keep response concise (under 800 characters).`;

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'mock-key') {
      const pendingCount = (bills || []).filter(b => b.status === 'UNPAID').length;
      return `[Bot Reply] You have ${pendingCount} unpaid bill(s) in the system. Check your HRMS dashboard for full details!`;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 350,
      temperature: 0.5
    });

    return response.choices[0]?.message?.content || "Sorry, I couldn't process your request right now.";
  } catch (err) {
    console.error('Error generating OpenAI response:', err.message);
    return "Hello! I am your CTI Bill Assistant. Ask me things like 'What bills are due this week?' or 'List my unpaid bills'.";
  }
}
