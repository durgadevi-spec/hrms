-- SQL Migration for WhatsApp Bill Reminder System
-- Run this script in your Supabase SQL Editor:

-- 1. Create bills table
CREATE TABLE IF NOT EXISTS public.bills (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNPAID',
    recipient_number TEXT NOT NULL,
    invoice_url TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance index for daily cron queries
CREATE INDEX IF NOT EXISTS idx_bills_unpaid_due ON public.bills (status, due_date);

-- 2. Create reminder_log table (Idempotency tracking per recipient)
CREATE TABLE IF NOT EXISTS public.reminder_log (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES public.bills(id) ON DELETE CASCADE,
    recipient_number TEXT NOT NULL DEFAULT '',
    sent_on DATE NOT NULL,
    days_left INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_bill_recipient_sent_on UNIQUE (bill_id, recipient_number, sent_on)
);
