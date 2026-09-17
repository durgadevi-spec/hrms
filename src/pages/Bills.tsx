import { useState, useEffect } from 'react';
import { 
  Receipt, Plus, Search, CheckCircle2, Clock, AlertCircle, 
  X, FileText, Zap, RefreshCw, Wallet, Send, CheckCheck, ExternalLink
} from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../utils/formatters';

interface Bill {
  id: number | string;
  name: string;
  amount: number;
  due_date: string;
  status: 'UNPAID' | 'PAID';
  recipient_number: string;
  invoice_url?: string;
  paid_at?: string;
  days_left: number;
}

interface Stats {
  totalPendingAmount: number;
  dueInNext4DaysCount: number;
  sentTodayCount: number;
  totalBillsCount: number;
}

interface Log {
  id: number;
  bill_name: string;
  amount: number;
  recipient_number: string;
  sent_on: string;
  days_left: number;
  created_at: string;
}

export default function Bills() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPendingAmount: 0,
    dueInNext4DaysCount: 0,
    sentTodayCount: 0,
    totalBillsCount: 0,
  });
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'UNPAID' | 'PAID'>('all');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [payModalBill, setPayModalBill] = useState<Bill | null>(null);

  // Add Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Pay Form State
  const [payInvoiceFile, setPayInvoiceFile] = useState<File | null>(null);
  const [isPaySubmitting, setIsPaySubmitting] = useState(false);

  // Manual Cron Trigger State
  const [isCronRunning, setIsCronRunning] = useState(false);

  const fetchBillsData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/api/bills');
      setBills(res.bills || []);
      setStats(res.stats || {
        totalPendingAmount: 0,
        dueInNext4DaysCount: 0,
        sentTodayCount: 0,
        totalBillsCount: 0,
      });
    } catch (err: any) {
      console.error('Error loading bills:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get('/api/bills/logs');
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Error loading logs:', err);
    }
  };

  useEffect(() => {
    fetchBillsData();
    fetchLogs();
  }, []);

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || !dueDate || !recipientNumber.trim()) {
      setErrorMsg('Please fill in all required fields');
      return;
    }

    const rawNumbers = recipientNumber.split(',').map(n => n.trim()).filter(Boolean);
    if (rawNumbers.length === 0) {
      setErrorMsg('Please enter at least one valid recipient phone number');
      return;
    }

    const phoneRegex = /^[0-9+]{7,15}$/;
    const invalidNum = rawNumbers.find(num => !phoneRegex.test(num.replace(/\s+/g, '')));
    if (invalidNum) {
      setErrorMsg(`Invalid phone number format: "${invalidNum}". Include country code without '+' (e.g. 919876543210).`);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('amount', amount);
      formData.append('due_date', dueDate);
      formData.append('recipient_number', rawNumbers.join(', '));

      const token = localStorage.getItem('token');
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add bill');

      setIsAddModalOpen(false);
      resetAddForm();
      fetchBillsData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error adding bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAddForm = () => {
    setName('');
    setAmount('');
    setDueDate('');
    setRecipientNumber('');
    setErrorMsg('');
  };

  const handleConfirmPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalBill) return;

    try {
      setIsPaySubmitting(true);
      const formData = new FormData();
      if (payInvoiceFile) {
        formData.append('invoice', payInvoiceFile);
      }

      const token = localStorage.getItem('token');
      const res = await fetch(`/api/bills/${payModalBill.id}/pay`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update bill');

      setPayModalBill(null);
      setPayInvoiceFile(null);
      fetchBillsData();
    } catch (err: any) {
      alert('Failed to mark bill as paid: ' + err.message);
    } finally {
      setIsPaySubmitting(false);
    }
  };

  const handleTriggerCron = async () => {
    try {
      setIsCronRunning(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/bills/cron/trigger', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger cron');

      alert(`Daily check completed!\nReminders sent: ${data.result.sent}, Skipped: ${data.result.skipped}`);
      fetchBillsData();
      fetchLogs();
    } catch (err: any) {
      alert('Error triggering reminder check: ' + err.message);
    } finally {
      setIsCronRunning(false);
    }
  };

  // Filtered bills
  const filteredBills = bills.filter(bill => {
    const matchesSearch = bill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          bill.recipient_number.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' ? true : bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            Bill Reminders
          </h1>
          <p className="text-sm text-secondary-500 dark:text-surface-400 mt-1">
            Automated WhatsApp reminders & invoice tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerCron}
            disabled={isCronRunning}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-surface-300 dark:border-surface-700 text-secondary-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-50"
          >
            <Zap className={cn("w-4 h-4 text-amber-500", isCronRunning && "animate-spin")} />
            {isCronRunning ? 'Checking...' : 'Run Daily Check'}
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Add Bill
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary-500 dark:text-surface-400 uppercase tracking-wider">Total Pending</p>
            <p className="text-xl font-bold text-secondary-900 dark:text-white mt-0.5">
              ₹{stats.totalPendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary-500 dark:text-surface-400 uppercase tracking-wider">Due in 0–4 Days</p>
            <p className="text-xl font-bold text-secondary-900 dark:text-white mt-0.5">
              {stats.dueInNext4DaysCount} Bills
            </p>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary-500 dark:text-surface-400 uppercase tracking-wider">Sent Today</p>
            <p className="text-xl font-bold text-secondary-900 dark:text-white mt-0.5">
              {stats.sentTodayCount} Reminders
            </p>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary-500 dark:text-surface-400 uppercase tracking-wider">Total Bills</p>
            <p className="text-xl font-bold text-secondary-900 dark:text-white mt-0.5">
              {stats.totalBillsCount} Total
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Bills Table (2 Spans) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl shadow-sm overflow-hidden">
            {/* Table Filters & Controls */}
            <div className="p-4 border-b border-surface-200 dark:border-surface-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Search bills or recipient..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-secondary-900 dark:text-white focus:outline-none focus:border-primary-500"
                />
              </div>
              <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-xl">
                {(['all', 'UNPAID', 'PAID'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all",
                      statusFilter === tab
                        ? "bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-300 shadow-sm"
                        : "text-secondary-600 dark:text-surface-400 hover:text-secondary-900 dark:hover:text-white"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-50 dark:bg-surface-800/50 text-secondary-500 dark:text-surface-400 text-xs uppercase tracking-wider font-semibold border-b border-surface-200 dark:border-surface-800">
                  <tr>
                    <th className="px-4 py-3.5">Bill Name</th>
                    <th className="px-4 py-3.5">Amount</th>
                    <th className="px-4 py-3.5">Due Date</th>
                    <th className="px-4 py-3.5">Recipient</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Invoice</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-secondary-500">
                        Loading bills data...
                      </td>
                    </tr>
                  ) : filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-secondary-500">
                        No bills found.
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map(bill => {
                      const daysLeft = bill.days_left;
                      const formattedAmount = `₹${parseFloat(bill.amount.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                      const formattedDate = new Date(bill.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });

                      return (
                        <tr key={bill.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-secondary-900 dark:text-white">
                            {bill.name}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-secondary-900 dark:text-surface-100">
                            {formattedAmount}
                          </td>
                          <td className="px-4 py-3.5 text-secondary-600 dark:text-surface-300">
                            {formattedDate}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {bill.recipient_number.split(',').map((num, idx) => (
                                <span key={idx} className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-surface-100 dark:bg-surface-800 text-secondary-700 dark:text-surface-300 border border-surface-200 dark:border-surface-700">
                                  {num.trim()}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            {bill.status === 'PAID' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5" /> PAID
                              </span>
                            ) : daysLeft >= 0 && daysLeft <= 4 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                <AlertCircle className="w-3.5 h-3.5" /> DUE {daysLeft === 0 ? 'TODAY' : `IN ${daysLeft}d`}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                <Clock className="w-3.5 h-3.5" /> UNPAID
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {bill.invoice_url ? (
                              <a
                                href={bill.invoice_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-primary-600 dark:text-primary-400 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" /> View
                              </a>
                            ) : (
                              <span className="text-xs text-secondary-400">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {bill.status === 'UNPAID' ? (
                              <button
                                onClick={() => setPayModalBill(bill)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                                <CheckCheck className="w-4 h-4" /> Done
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: WhatsApp Reminder Log Panel (1 Span) */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-800 mb-3">
              <h2 className="font-bold text-secondary-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-primary-500" />
                WhatsApp Activity Log
              </h2>
              <button
                onClick={fetchLogs}
                className="p-1 text-secondary-400 hover:text-secondary-600 dark:hover:text-white rounded-lg transition-colors"
                title="Refresh Logs"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <p className="text-xs text-secondary-500 text-center py-6">No reminder logs recorded yet.</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-surface-200 dark:border-surface-800 text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-secondary-900 dark:text-white">
                      <span>📲 Sent to {log.recipient_number}</span>
                      <span className="text-[10px] text-secondary-400 font-normal">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-secondary-600 dark:text-surface-300">
                      Bill: <strong>{log.bill_name}</strong> (₹{parseFloat((log.amount || 0).toString()).toLocaleString('en-IN')})
                    </p>
                    <p className="text-[11px] text-secondary-500 dark:text-surface-400">
                      Due in {log.days_left} day(s) • Logged on {log.sent_on}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add New Bill */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800">
              <h2 className="text-lg font-bold text-secondary-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary-600" />
                Add New Bill Reminder
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-secondary-400 hover:text-secondary-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBill} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 text-xs bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-xl border border-red-200">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                  Bill Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Internet Bill, Office Rent, Electricity"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-secondary-900 dark:text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1500.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-secondary-900 dark:text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-secondary-900 dark:text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                  Recipient WhatsApp Numbers (comma-separated for multiple) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 919876543210, 919123456789"
                  value={recipientNumber}
                  onChange={e => setRecipientNumber(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-secondary-900 dark:text-white focus:outline-none focus:border-primary-500"
                />
                <span className="text-[11px] text-secondary-500 mt-1 block">
                  Separate multiple phone numbers with commas. Include country code without '+' (e.g. 919876543210, 919876543211)
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-secondary-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Mark as Paid & Upload Invoice */}
      {payModalBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPayModalBill(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800">
              <h2 className="text-lg font-bold text-secondary-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Mark Bill as Paid
              </h2>
              <button onClick={() => setPayModalBill(null)} className="text-secondary-400 hover:text-secondary-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPay} className="p-6 space-y-4">
              <p className="text-xs text-secondary-600 dark:text-surface-300">
                You are marking <strong>"{payModalBill.name}"</strong> (₹{parseFloat(payModalBill.amount.toString()).toLocaleString('en-IN')}) as <strong>PAID</strong>. Automated WhatsApp reminders will stop immediately.
              </p>

              <div>
                <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                  Upload Payment Receipt / Invoice (Optional PDF/Image)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={e => setPayInvoiceFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-secondary-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-800">
                <button
                  type="button"
                  onClick={() => setPayModalBill(null)}
                  className="px-4 py-2 text-xs font-semibold text-secondary-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPaySubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {isPaySubmitting ? 'Updating...' : 'Confirm Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
