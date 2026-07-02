import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '../../../utils/formatters';

interface Props {
  data: any[];
  errors: any;
  onChange: (data: any[]) => void;
}

export default function EmergencyContactForm({ data, errors, onChange }: Props) {
  const handleAdd = () => {
    onChange([...data, { name: '', relationship: '', phone: '', alternativePhone: '' }]);
  };

  const handleRemove = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: string, value: string) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    onChange(newData);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl mb-6">
        <p className="text-sm text-primary-800 dark:text-primary-300">
          Emergency contacts are strictly confidential and used only in case of emergency.
        </p>
      </div>

      {data.map((item, index) => (
        <div key={index} className="p-5 bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 rounded-xl relative group">
          <button 
            onClick={() => handleRemove(index)}
            className="absolute top-4 right-4 p-1.5 text-secondary-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Remove Contact"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-secondary-600 dark:text-surface-400 mb-1">Contact Name</label>
              <input value={item.name || ''} onChange={e => handleChange(index, 'name', e.target.value)} className="input-field" placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-600 dark:text-surface-400 mb-1">Relationship</label>
              <select value={item.relationship || ''} onChange={e => handleChange(index, 'relationship', e.target.value)} className="input-field">
                <option value="">Select</option>
                <option value="Spouse">Spouse</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Child">Child</option>
                <option value="Friend">Friend</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-secondary-600 dark:text-surface-400 mb-1">Phone Number</label>
              <input type="tel" value={item.phone || ''} onChange={e => handleChange(index, 'phone', e.target.value)} className="input-field" placeholder="+1-555-0100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-600 dark:text-surface-400 mb-1">Alternative Phone</label>
              <input type="tel" value={item.alternativePhone || ''} onChange={e => handleChange(index, 'alternativePhone', e.target.value)} className="input-field" placeholder="+1-555-0101" />
            </div>
          </div>
        </div>
      ))}

      <button 
        onClick={handleAdd}
        className="w-full py-3 flex items-center justify-center gap-2 border-2 border-dashed border-primary-200 text-primary-600 hover:bg-primary-50 rounded-xl transition-colors font-medium text-sm"
      >
        <Plus className="w-4 h-4" /> Add Emergency Contact
      </button>
    </div>
  );
}
