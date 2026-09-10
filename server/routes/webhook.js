import { Router } from 'express';
import { generateAIResponse } from '../services/openai.js';
import { sendFreeformMessage } from '../services/whatsapp.js';

const router = Router();

// GET /webhook - WhatsApp Cloud API Verification Handshake
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || 'my_whatsapp_webhook_verify_token_123';

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ WhatsApp Webhook verified successfully!');
      return res.status(200).send(challenge);
    } else {
      console.warn('❌ WhatsApp Webhook verification failed token mismatch');
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
});

// POST /webhook - Inbound WhatsApp message receiver
router.post('/', async (req, res) => {
  const body = req.body;

  res.status(200).send('EVENT_RECEIVED');

  try {
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (messages && messages.length > 0) {
        const msg = messages[0];
        const fromNumber = msg.from;
        const msgType = msg.type;

        if (msgType === 'text') {
          const userText = msg.text.body;
          console.log(`📩 Inbound WhatsApp message from ${fromNumber}: "${userText}"`);

          const aiReply = await generateAIResponse(userText, fromNumber);
          await sendFreeformMessage({ recipientNumber: fromNumber, text: aiReply });
        }
      }
    }
  } catch (err) {
    console.error('Error handling WhatsApp webhook event:', err);
  }
});

export default router;
