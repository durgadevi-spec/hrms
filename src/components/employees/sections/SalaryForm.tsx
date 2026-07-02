import React from 'react';
import { cn } from '../../../utils/formatters';

interface Props {
  data: any;
  errors: any;
  onChange: (data: any) => void;
}

export default function SalaryForm({ data, errors, onChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    onChange({ ...data, [name]: type === 'number' ? Number(value) : value });
  };

  const inputCls = (field: string) => cn(
    'input-field',
    errors?.[field] && 'border-error-500 focus:ring-error-500/20 focus:border-error-500'
  );

  return (
    <div className="space-y-6">
      <div className="p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl mb-6">
        <p className="text-sm text-warning-800 dark:text-warning-300">
          This section is strictly confidential and only visible to Administrators and HR personnel.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Base Salary (Annual)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500">
              {data.currency === 'INR' ? '₹' : '$'}
            </span>
            <input type="number" name="baseSalary" value={data.baseSalary || ''} onChange={handleChange} className={inputCls('baseSalary') + " pl-8"} placeholder="60000" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Currency</label>
          <select name="currency" value={data.currency || 'USD'} onChange={handleChange} className={inputCls('currency')}>
            <option value="USD">USD – US Dollar</option>
            <option value="INR">INR – Indian Rupee</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Bank Name</label>
          <input name="bankName" value={data.bankName || ''} onChange={handleChange} className={inputCls('bankName')} placeholder="Chase Bank" />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Bank Account Number</label>
          <input name="bankAccountNumber" value={data.bankAccountNumber || ''} onChange={handleChange} className={inputCls('bankAccountNumber')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">
            {data.currency === 'INR' ? 'IFSC Code' : 'Routing Number / Swift Code'}
          </label>
          <input name="routingNumber" value={data.routingNumber || ''} onChange={handleChange} className={inputCls('routingNumber')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Tax Identification Number</label>
          <input name="taxId" value={data.taxId || ''} onChange={handleChange} className={inputCls('taxId')} placeholder="SSN / PAN / etc." />
        </div>
      </div>
    </div>
  );
}
