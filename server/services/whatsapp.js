import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Normalizes phone numbers to Meta WhatsApp international format (e.g. 919876543210)
 */
export function normalizePhoneNumber(number) {
  if (!number) return '';
  let cleaned = number.toString().replace(/[^0-9]/g, '');
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }
  return cleaned;
}

/**
 * Sends a pre-approved template message via WhatsApp Cloud API
 */
export async function sendTemplateMessage({ recipientNumber, billName, amount, daysLeftLabel }) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || 'bill_reminder';
  const langCode = process.env.WHATSAPP_TEMPLATE_LANG || 'en_US';

  if (!token || !phoneNumberId) {
    console.warn(`[WhatsApp API Mock] Missing WHATSAPP_TOKEN or PHONE_NUMBER_ID. Simulating send to ${recipientNumber}`);
    return { success: true, mock: true };
  }

  const formattedNumber = normalizePhoneNumber(recipientNumber);
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  const templatePayload = {
    name: templateName,
    language: { code: langCode }
  };

  // Attach body parameters if NOT using Meta's default parameterless 'hello_world' template
  if (templateName !== 'hello_world') {
    templatePayload.components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: billName },
          { type: 'text', text: `${parseFloat(amount).toLocaleString('en-IN')}` },
          { type: 'text', text: daysLeftLabel }
        ]
      }
    ];
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: formattedNumber,
    type: 'template',
    template: templatePayload
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      const errObj = data.error || {};
      const errCode = errObj.code;
      const errMsg = errObj.message || 'Failed to send WhatsApp template message';
      console.error(`❌ Meta WhatsApp API Error [Code ${errCode || 'N/A'}]:`, errObj);
      throw new Error(`[Meta Error ${errCode || 'Unknown'}] ${errMsg}`);
    }

    console.log(`✅ WhatsApp reminder template (${templateName}, ${langCode}) sent to ${formattedNumber}`);
    return { success: true, data };
  } catch (err) {
    console.error(`❌ Failed to send WhatsApp message to ${recipientNumber}:`, err.message);
    throw err;
  }
}

/**
 * Sends a freeform text message (valid within 24h customer interaction window)
 */
export async function sendFreeformMessage({ recipientNumber, text }) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn(`[WhatsApp API Mock] Simulating freeform message to ${recipientNumber}: "${text}"`);
    return { success: true, mock: true };
  }

  const formattedNumber = normalizePhoneNumber(recipientNumber);
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedNumber,
    type: 'text',
    text: { body: text }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('WhatsApp Freeform API Error:', data);
      throw new Error(data.error?.message || 'Failed to send WhatsApp text message');
    }

    console.log(`✅ WhatsApp freeform reply sent to ${formattedNumber}`);
    return { success: true, data };
  } catch (err) {
    console.error(`❌ Failed to send WhatsApp freeform message to ${recipientNumber}:`, err.message);
    throw err;
  }
}
