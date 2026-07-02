import React, { useEffect, useState } from 'react';
import { cn } from '../../../utils/formatters';
import { api } from '../../../lib/api';
import { useDepartments } from '../../../context/DepartmentsContext';

interface Props {
  data: any;
  errors: any;
  onChange: (data: any) => void;
}

export default function JobDetailsForm({ data, errors, onChange }: Props) {
  const { departments } = useDepartments();
  const [managers, setManagers] = useState<any[]>([]);

  useEffect(() => {
    // Fetch potential managers
    api.get('/api/employees')
      .then(res => {
        const mgrs = res.filter((e: any) => e.role === 'admin' || e.role === 'manager' || e.role === 'hr');
        setManagers(mgrs);
      })
      .catch(console.error);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  const inputCls = (field: string) => cn(
    'input-field',
    errors?.[field] && 'border-error-500 focus:ring-error-500/20 focus:border-error-500'
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Employee ID <span className="text-error-500">*</span></label>
          <input name="employeeId" value={data.employeeId || ''} onChange={handleChange} className={inputCls('employeeId')} placeholder="EMP001" />
          {errors?.employeeId && <p className="text-xs text-error-600 mt-1">{errors.employeeId}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Designation</label>
          <input name="designation" value={data.designation || ''} onChange={handleChange} className={inputCls('designation')} placeholder="Software Engineer" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Department <span className="text-error-500">*</span></label>
          <select name="departmentId" value={data.departmentId || ''} onChange={handleChange} className={inputCls('departmentId')}>
            <option value="">Select Department</option>
            {departments.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {errors?.departmentId && <p className="text-xs text-error-600 mt-1">{errors.departmentId}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Reporting Manager</label>
          <select name="reportingManagerId" value={data.reportingManagerId || ''} onChange={handleChange} className={inputCls('reportingManagerId')}>
            <option value="">None</option>
            {managers.map(m => (
              <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.designation})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Date of Joining</label>
          <input type="date" name="joiningDate" value={data.joiningDate || ''} onChange={handleChange} className={inputCls('joiningDate')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Employment Type</label>
          <select name="employmentType" value={data.employmentType || ''} onChange={handleChange} className={inputCls('employmentType')}>
            <option value="Full-Time">Full-Time</option>
            <option value="Part-Time">Part-Time</option>
            <option value="Contract">Contract</option>
            <option value="Intern">Intern</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Employment Status</label>
          <select name="employmentStatus" value={data.employmentStatus || ''} onChange={handleChange} className={inputCls('employmentStatus')}>
            <option value="Active">Active</option>
            <option value="Probation">Probation</option>
            <option value="Notice Period">Notice Period</option>
            <option value="Resigned">Resigned</option>
            <option value="Terminated">Terminated</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Work Location</label>
          <input name="workLocation" value={data.workLocation || ''} onChange={handleChange} className={inputCls('workLocation')} placeholder="New York Office" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Role (System Access)</label>
          <select name="role" value={data.role || 'employee'} onChange={handleChange} className={inputCls('role')}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="hr">HR</option>
            <option value="admin">Admin</option>
          </select>
          <p className="text-xs text-secondary-500 mt-1">Determines what the user can see in the system.</p>
        </div>
      </div>

    </div>
  );
}
