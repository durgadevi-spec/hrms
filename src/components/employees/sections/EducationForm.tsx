import { Plus, Trash2 } from 'lucide-react';

interface Props {
  data: any[];
  errors: any;
  onChange: (data: any[]) => void;
}

export default function EducationForm({ data, onChange }: Props) {
  const handleAdd = () => {
    onChange([...data, { degree: '', institution: '', yearOfPassing: '', grade: '' }]);
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
      {data.map((item, index) => (
        <div key={index} className="p-5 bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 rounded-xl relative group">
          <button 
            onClick={() => handleRemove(index)}
            className="absolute top-4 right-4 p-1.5 text-secondary-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Remove Education"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-secondary-600 dark:text-surface-400 mb-1">Degree / Qualification</label>
              <input value={item.degree || ''} onChange={e => handleChange(index, 'degree', e.target.value)} className="input-field" placeholder="e.g. B.Tech Computer Science" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-600 dark:text-surface-400 mb-1">Institution / University</label>
              <input value={item.institution || ''} onChange={e => handleChange(index, 'institution', e.target.value)} className="input-field" placeholder="e.g. MIT" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-secondary-600 dark:text-surface-400 mb-1">Year of Passing</label>
              <input type="number" value={item.yearOfPassing || ''} onChange={e => handleChange(index, 'yearOfPassing', e.target.value)} className="input-field" placeholder="2020" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-600 dark:text-surface-400 mb-1">Grade / CGPA</label>
              <input value={item.grade || ''} onChange={e => handleChange(index, 'grade', e.target.value)} className="input-field" placeholder="3.8 / First Class" />
            </div>
          </div>
        </div>
      ))}

      <button 
        onClick={handleAdd}
        className="w-full py-3 flex items-center justify-center gap-2 border-2 border-dashed border-primary-200 text-primary-600 hover:bg-primary-50 rounded-xl transition-colors font-medium text-sm"
      >
        <Plus className="w-4 h-4" /> Add Education
      </button>
    </div>
  );
}
