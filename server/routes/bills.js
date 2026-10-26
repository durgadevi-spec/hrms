import { Router } from 'express';
import multer from 'multer';
import supabase from '../supabase.js';
import { runDailyReminderCheck } from '../cron/reminderCron.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Ensure Supabase storage bucket exists
let bucketChecked = false;
async function ensureInvoicesBucket() {
  if (bucketChecked) return;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === 'invoices' || b.id === 'invoices');
    if (!exists) {
      const { error } = await supabase.storage.createBucket('invoices', { public: true });
      if (error && !error.message?.includes('already exists')) {
        console.warn('Could not auto-create invoices bucket:', error.message);
      }
    }
    bucketChecked = true;
  } catch (err) {
    console.warn('Warning checking storage buckets:', err.message);
  }
}

// Helper to upload file buffer to Supabase Storage
async function uploadInvoiceFile(file) {
  if (!file) return null;

  await ensureInvoicesBucket();

  const fileName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  
  try {
    const { data, error } = await supabase.storage
      .from('invoices')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) {
      console.error('Supabase storage upload error:', error.message);
      // Fallback to Data URI so the file is still viewable even if storage has permission issues
      return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
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

// Helper to parse multiple invoice URLs from stored invoice_url
export function parseInvoiceUrls(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch {}
    }
    if (trimmed.includes(',')) {
      return trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [trimmed].filter(Boolean);
  }
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return [];
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
        invoice_urls: parseInvoiceUrls(b.invoice_url),
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

// POST /api/bills - Create new bill (supports multiple invoices)
router.post('/', upload.any(), async (req, res) => {
  try {
    const { name, amount, due_date, recipient_number } = req.body;

    const cleanRecipients = (recipient_number || '')
      .split(',')
      .map(num => num.trim())
      .filter(Boolean)
      .join(', ');

    if (!cleanRecipients) {
      return res.status(400).json({ error: 'At least one valid recipient phone number is required.' });
    }

    const files = req.files || (req.file ? [req.file] : []);
    const uploadedUrls = await Promise.all(files.map(f => uploadInvoiceFile(f)));
    const validUrls = uploadedUrls.filter(Boolean);
    const invoice_url = validUrls.length > 0 ? (validUrls.length === 1 ? validUrls[0] : JSON.stringify(validUrls)) : null;

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

// POST /api/bills/:id/pay - Mark as PAID & attach invoice file(s)
router.post('/:id/pay', upload.any(), async (req, res) => {
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

    const files = req.files || (req.file ? [req.file] : []);
    const uploadedUrls = await Promise.all(files.map(f => uploadInvoiceFile(f)));
    const validNewUrls = uploadedUrls.filter(Boolean);

    let existingUrls = parseInvoiceUrls(existingBill.invoice_url);
    const combinedUrls = [...existingUrls, ...validNewUrls];
    const invoice_url = combinedUrls.length > 0 ? (combinedUrls.length === 1 ? combinedUrls[0] : JSON.stringify(combinedUrls)) : null;

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

// PUT /api/bills/:id - Update existing bill (supports multiple invoices)
router.put('/:id', upload.any(), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, amount, due_date, recipient_number, status, remove_invoice, existing_invoices } = req.body;

    const { data: existingBill, error: findError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existingBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Determine kept existing invoices
    let keptUrls = [];
    if (remove_invoice === 'true' || remove_invoice === true) {
      keptUrls = [];
    } else if (existing_invoices !== undefined) {
      keptUrls = parseInvoiceUrls(existing_invoices);
    } else {
      keptUrls = parseInvoiceUrls(existingBill.invoice_url);
    }

    // Upload any newly attached files
    const files = req.files || (req.file ? [req.file] : []);
    const uploadedUrls = await Promise.all(files.map(f => uploadInvoiceFile(f)));
    const validNewUrls = uploadedUrls.filter(Boolean);

    const combinedUrls = [...keptUrls, ...validNewUrls];
    const invoice_url = combinedUrls.length > 0 ? (combinedUrls.length === 1 ? combinedUrls[0] : JSON.stringify(combinedUrls)) : null;

    let cleanRecipients = existingBill.recipient_number;
    if (recipient_number) {
      cleanRecipients = recipient_number
        .split(',')
        .map(num => num.trim())
        .filter(Boolean)
        .join(', ');
      if (!cleanRecipients) {
        return res.status(400).json({ error: 'At least one valid recipient phone number is required.' });
      }
    }

    const updates = {
      name: name !== undefined ? name.trim() : existingBill.name,
      amount: amount !== undefined ? parseFloat(amount) : existingBill.amount,
      due_date: due_date !== undefined ? due_date : existingBill.due_date,
      recipient_number: cleanRecipients,
      invoice_url
    };

    if (status !== undefined) {
      updates.status = status;
      if (status === 'PAID' && !existingBill.paid_at) {
        updates.paid_at = new Date().toISOString();
      } else if (status === 'UNPAID') {
        updates.paid_at = null;
      }
    }

    const { data: updatedBill, error: updateError } = await supabase
      .from('bills')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.json({ message: 'Bill updated successfully', bill: updatedBill });
  } catch (err) {
    console.error('Error updating bill:', err);
    return res.status(500).json({ error: err.message || 'Failed to update bill' });
  }
});

// DELETE /api/bills/:id - Delete a bill
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Remove any reminder logs associated with this bill first
    await supabase
      .from('reminder_log')
      .delete()
      .eq('bill_id', id);

    const { error } = await supabase
      .from('bills')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.json({ message: 'Bill deleted successfully' });
  } catch (err) {
    console.error('Error deleting bill:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete bill' });
  }
});

export default router;
