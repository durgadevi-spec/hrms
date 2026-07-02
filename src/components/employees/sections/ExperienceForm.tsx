import { Plus, Trash2 } from 'lucide-react';

interface Props {
  data: any[];
  errors: any;
  onChange: (data: any[]) => void;
}

export default function ExperienceForm({ data, onChange }: Props) {
  const handleAdd = () => {
    onChange([...data, { companyName: '', jobTitle: '', startDate: '', endDate: '', description: '' }]);
  };

  const handleRemove = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: string, value: string) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    onChange(newData);
  };

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange(index, 'document', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {data.map((item, index) => (
        <div key={index} className="p-5 bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 rounded-xl relative group">
          <button 
            onClick={() => handleRemove(index)}
            className="absolute top-4 right-4 p-1.5 text-secondary-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Remove Experience"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-secondary-600 dark:text-surface-400 mb-1">Company Name</label>
              <input value={item.companyName || ''} onChange={e => handleChange(index, 'companyName', e.target.value)} className="input-field" placeholder="Acme Corp" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-600 dark:text-surface-400 mb-1">Job Title / Designation</label>
              <input value={item.jobTitle || ''} onChange={e => handleChange(index, 'jobTitle', e.target.value)} className="input-field" placeholder="Software Engineer" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-secondary-600 dark:text-surface-400 mb-1">Start Date</label>
              <input type="date" value={item.startDate || ''} onChange={e => handleChange(index, 'startDate', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-600 dark:text-surface-400 mb-1">End Date</label>
              <input type="date" value={item.endDate || ''} onChange={e => handleChange(index, 'endDate', e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-secondary-600 dark:text-surface-400 mb-1">Job Description / Responsibilities</label>
              <textarea value={item.description || ''} onChange={e => handleChange(index, 'description', e.target.value)} className="input-field h-20 resize-none" placeholder="Briefly describe your role..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-600 dark:text-surface-400 mb-1">Supporting Document (Experience/Relieving Letter)</label>
              <div className="mt-1 flex items-center gap-4">
                {item.document ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-surface-200 dark:border-surface-700">
                    <img src={item.document} alt="Document" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => handleChange(index, 'document', '')}
                      className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-black/70">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-20 rounded-lg border-2 border-dashed border-surface-300 dark:border-surface-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex flex-col items-center justify-center cursor-pointer transition-colors">
                    <span className="text-xs text-secondary-500 font-medium">Upload Document</span>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf" 
                      className="hidden" 
                      onChange={(e) => handleImageUpload(index, e)} 
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      <button 
        onClick={handleAdd}
        className="w-full py-3 flex items-center justify-center gap-2 border-2 border-dashed border-primary-200 text-primary-600 hover:bg-primary-50 rounded-xl transition-colors font-medium text-sm"
      >
        <Plus className="w-4 h-4" /> Add Experience
      </button>
    </div>
  );
}
