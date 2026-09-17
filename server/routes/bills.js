import { Router } from 'express';
import multer from 'multer';
import supabase from '../supabase.js';
import { runDailyReminderCheck } from '../cron/reminderCron.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Helper to upload file buffer to Supabase Storage
async function uploadInvoiceFile(file) {
  if (!file) return null;

  const fileName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  
  try {
    const { data, error } = await supabase.storage
      .from('invoices')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) {
      console.warn('Supabase storage upload warning (creating bucket if needed):', error.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from('invoices')
      .getPublicUrl(data?.path || fileName);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.warn('Falling back to Data URI for invoice file:', err.message);
    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  }
}

// GET /api/bills - Fetch bills and dashboard summary stats
router.get('/', async (req, res) => {
  try {
    const { data: bills, error } = await supabase
      .from('bills')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) throw error;

    const todayStr = new Date().toISOString().split('T')[0];
    let totalPendingAmount = 0;
    let dueInNext4DaysCount = 0;

    const processedBills = (bills || []).map(b => {
      const dueDate = new Date(b.due_date);
      const todayDate = new Date(todayStr);
      const diffTime = dueDate.getTime() - todayDate.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (b.status === 'UNPAID') {
        totalPendingAmount += parseFloat(b.amount || 0);
        if (daysLeft >= 0 && daysLeft <= 4) {
          dueInNext4DaysCount++;
        }
      }

      return {
        ...b,
        days_left: daysLeft
      };
    });

    // Count reminders sent today
    const { data: todayLogs } = await supabase
      .from('reminder_log')
      .select('id')
      .eq('sent_on', todayStr);

    return res.json({
      bills: processedBills,
      stats: {
        totalPendingAmount,
        dueInNext4DaysCount,
        sentTodayCount: (todayLogs || []).length,
        totalBillsCount: processedBills.length
      }
    });
  } catch (err) {
    console.error('Error fetching bills:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch bills' });
  }
});

// POST /api/bills - Create new bill
router.post('/', upload.single('invoice'), async (req, res) => {
  try {
    const { name, amount, due_date, recipient_number } = req.body;

    const cleanRecipients = recipient_number
      .split(',')
      .map(num => num.trim())
      .filter(Boolean)
      .join(', ');

    if (!cleanRecipients) {
      return res.status(400).json({ error: 'At least one valid recipient phone number is required.' });
    }

    let invoice_url = null;
    if (req.file) {
      invoice_url = await uploadInvoiceFile(req.file);
    }

    const { data, error } = await supabase
      .from('bills')
      .insert({
        name: name.trim(),
        amount: parseFloat(amount),
        due_date,
        recipient_number: cleanRecipients,
        status: 'UNPAID',
        invoice_url
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ message: 'Bill created successfully', bill: data });
  } catch (err) {
    console.error('Error creating bill:', err);
    return res.status(500).json({ error: err.message || 'Failed to create bill' });
  }
});

// POST /api/bills/:id/pay - Mark as PAID & attach invoice file
router.post('/:id/pay', upload.single('invoice'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existingBill } = await supabase
      .from('bills')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    let invoice_url = existingBill.invoice_url;
    if (req.file) {
      invoice_url = await uploadInvoiceFile(req.file);
    }

    const { data, error } = await supabase
      .from('bills')
      .update({
        status: 'PAID',
        paid_at: new Date().toISOString(),
        invoice_url
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ message: 'Bill marked as PAID successfully', bill: data });
  } catch (err) {
    console.error('Error marking bill as paid:', err);
    return res.status(500).json({ error: err.message || 'Failed to update bill' });
  }
});

// GET /api/bills/logs - Fetch WhatsApp reminder logs
router.get('/logs', async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from('reminder_log')
      .select('*, bills(name, amount, recipient_number)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const formattedLogs = (logs || []).map(l => ({
      id: l.id,
      bill_id: l.bill_id,
      sent_on: l.sent_on,
      days_left: l.days_left,
      created_at: l.created_at,
      bill_name: l.bills?.name,
      amount: l.bills?.amount,
      recipient_number: l.recipient_number || l.bills?.recipient_number
    }));

    return res.json({ logs: formattedLogs });
  } catch (err) {
    console.error('Error fetching logs:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch logs' });
  }
});

// POST /api/bills/cron/trigger - Manual trigger test endpoint
router.post('/cron/trigger', async (req, res) => {
  try {
    const result = await runDailyReminderCheck();
    return res.json({ message: 'Daily reminder check executed manually', result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
