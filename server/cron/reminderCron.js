import cron from 'node-cron';
import supabase from '../supabase.js';
import { sendTemplateMessage } from '../services/whatsapp.js';

function getDaysLeftLabel(daysLeft) {
  if (daysLeft === 0) return 'today';
  if (daysLeft === 1) return 'tomorrow';
  return `in ${daysLeft} days`;
}

/**
 * Calculates exact date-only difference between due_date and today (Asia/Kolkata)
 */
function calculateDaysLeft(dueDateStr) {
  const dueOnly = (dueDateStr || '').toString().split('T')[0];
  const [dYear, dMonth, dDay] = dueOnly.split('-').map(Number);
  
  // Today's YYYY-MM-DD in Asia/Kolkata timezone
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [tYear, tMonth, tDay] = todayStr.split('-').map(Number);

  const dueMs = Date.UTC(dYear, dMonth - 1, dDay);
  const todayMs = Date.UTC(tYear, tMonth - 1, tDay);

  const daysLeft = Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24));
  return { daysLeft, todayStr, dueOnly };
}

/**
 * Runs daily check for bills due in 0-4 days and sends WhatsApp reminders
 */
export async function runDailyReminderCheck() {
  console.log(`\n======================================================`);
  console.log(`🕒 [Cron Diagnostic] Starting daily WhatsApp bill reminder job...`);
  
  try {
    // 1. Fetch UNPAID bills
    console.log(`🔍 [Cron Diagnostic] Querying Supabase: SELECT * FROM bills WHERE status = 'UNPAID'`);
    const { data: bills, error } = await supabase
      .from('bills')
      .select('*')
      .eq('status', 'UNPAID');

    if (error) {
      console.error('❌ [Cron Diagnostic] Error querying bills:', error.message);
      return { success: false, error: error.message };
    }

    console.log(`📋 [Cron Diagnostic] Unpaid bills found in DB: ${bills ? bills.length : 0}`);

    let sentCount = 0;
    let skippedCount = 0;

    for (const bill of bills || []) {
      const { daysLeft, todayStr, dueOnly } = calculateDaysLeft(bill.due_date);
      console.log(`\n👉 [Cron Diagnostic] Evaluating Bill ID: ${bill.id} ("${bill.name}")`);
      console.log(`   - Recipient List: ${bill.recipient_number}`);
      console.log(`   - Due Date (DB): ${bill.due_date} -> Normalized: ${dueOnly}`);
      console.log(`   - Today Date (Asia/Kolkata): ${todayStr}`);
      console.log(`   - Computed Days Left: ${daysLeft}`);

      // Skip if outside 0 to 4 days range
      if (daysLeft < 0 || daysLeft > 4) {
        console.log(`   - ⏭️ Outside 0-4 day range (${daysLeft} days). Skipping.`);
        continue;
      }

      // Split comma-separated recipient numbers
      const recipients = (bill.recipient_number || '')
        .split(',')
        .map(num => num.trim())
        .filter(Boolean);

      if (recipients.length === 0) {
        console.log(`   - ⏭️ No valid recipient numbers found for bill ID ${bill.id}. Skipping.`);
        continue;
      }

      for (const rawRecipient of recipients) {
        // Check if ALREADY successfully sent to this specific recipient today
        console.log(`   - 🔍 Checking if reminder was already sent to ${rawRecipient} today (${todayStr})...`);
        const { data: existingLog } = await supabase
          .from('reminder_log')
          .select('id')
          .eq('bill_id', bill.id)
          .eq('recipient_number', rawRecipient)
          .eq('sent_on', todayStr)
          .maybeSingle();

        if (existingLog) {
          console.log(`   - ⏭️ Already successfully sent to ${rawRecipient} today (Log ID: ${existingLog.id}). Skipping.`);
          skippedCount++;
          continue;
        }

        // Attempt to send WhatsApp message to this recipient
        console.log(`   - 📲 Attempting WhatsApp send to ${rawRecipient}...`);
        try {
          const daysLeftLabel = getDaysLeftLabel(daysLeft);
          const sendResult = await sendTemplateMessage({
            recipientNumber: rawRecipient,
            billName: bill.name,
            amount: bill.amount,
            daysLeftLabel
          });

          console.log(`   - 🚀 WhatsApp API Send Result for ${rawRecipient}:`, sendResult);

          // ONLY record log AFTER confirmed successful send!
          console.log(`   - 📝 Recording successful send to ${rawRecipient} in reminder_log...`);
          const { data: logData, error: logErr } = await supabase
            .from('reminder_log')
            .insert({
              bill_id: bill.id,
              recipient_number: rawRecipient,
              sent_on: todayStr,
              days_left: daysLeft
            })
            .select()
            .single();

          if (logErr) {
            console.warn(`   - ⚠️ Note: Message sent to ${rawRecipient} but log record failed:`, logErr.message);
          } else {
            console.log(`   - ✅ Reminder log recorded for ${rawRecipient} (Log ID: ${logData.id}).`);
          }

          sentCount++;
        } catch (sendErr) {
          console.error(`   - ❌ Failed to send WhatsApp message to ${rawRecipient} for bill ID ${bill.id}:`, sendErr.message);
          console.error(`   - ⚠️ Log entry NOT created for ${rawRecipient}, so it can be retried on next check.`);
        }

        // Small delay (300ms) between group recipient sends to prevent API rate limits / throttling
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    console.log(`\n✅ [Cron Diagnostic] Summary: ${sentCount} sent, ${skippedCount} skipped.`);
    console.log(`======================================================\n`);
    return { success: true, sent: sentCount, skipped: skippedCount };
  } catch (err) {
    console.error('❌ Error during daily reminder cron run:', err);
    throw err;
  }
}

/**
 * Registers node-cron daily schedule at 09:00 AM Asia/Kolkata
 */
export function initReminderCron() {
  cron.schedule('0 9 * * *', async () => {
    await runDailyReminderCheck();
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('⏰ Bill Reminder Cron scheduled daily at 09:00 AM (Asia/Kolkata).');
}
