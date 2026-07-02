import React, { useRef } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';
import { cn } from '../../../utils/formatters';

interface Props {
  data: any;
  errors: any;
  onChange: (data: any) => void;
}

export default function PersonalInfoForm({ data, errors, onChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    if (type === 'checkbox') {
      finalValue = (e.target as HTMLInputElement).checked;
    }
    onChange({ ...data, [name]: finalValue });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const passportInputRef = useRef<HTMLInputElement>(null);
  const visaInputRef = useRef<HTMLInputElement>(null);
  const aadhaarInputRef = useRef<HTMLInputElement>(null);
  const panInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ ...data, [fieldName]: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const inputCls = (field: string) => cn(
    'input-field',
    errors?.[field] && 'border-error-500 focus:ring-error-500/20 focus:border-error-500'
  );

  return (
    <div className="space-y-6">
      {/* Profile Picture Upload */}
      <div className="flex items-center gap-6 mb-6 pb-6 border-b border-surface-200 dark:border-surface-800">
        <div className="relative w-24 h-24 rounded-full border-4 border-surface-50 dark:border-surface-800 bg-surface-100 dark:bg-surface-800 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
          {data.profilePicture ? (
            <img src={data.profilePicture} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-8 h-8 text-surface-400" />
          )}
        </div>
        <div>
          <h4 className="text-sm font-bold text-secondary-900 dark:text-white mb-1">Profile Picture</h4>
          <p className="text-xs text-secondary-500 mb-3">Upload a square image, max 2MB.</p>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={(e) => handleImageUpload(e, 'profilePicture')} 
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()} 
            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-2">
            <Upload className="w-3.5 h-3.5" /> Upload Photo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">First Name <span className="text-error-500">*</span></label>
          <input name="firstName" value={data.firstName || ''} onChange={handleChange} className={inputCls('firstName')} placeholder="John" />
          {errors?.firstName && <p className="text-xs text-error-600 mt-1">{errors.firstName}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Last Name <span className="text-error-500">*</span></label>
          <input name="lastName" value={data.lastName || ''} onChange={handleChange} className={inputCls('lastName')} placeholder="Doe" />
          {errors?.lastName && <p className="text-xs text-error-600 mt-1">{errors.lastName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Official Email <span className="text-error-500">*</span></label>
          <input type="email" name="officialEmail" value={data.officialEmail || ''} onChange={handleChange} className={inputCls('officialEmail')} placeholder="john.doe@company.com" />
          {errors?.officialEmail && <p className="text-xs text-error-600 mt-1">{errors.officialEmail}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Personal Email</label>
          <input type="email" name="personalEmail" value={data.personalEmail || ''} onChange={handleChange} className={inputCls('personalEmail')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Phone Number</label>
          <input type="tel" name="phone" value={data.phone || ''} onChange={handleChange} className={inputCls('phone')} placeholder="+1-555-0100" />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Date of Birth</label>
          <input type="date" name="dateOfBirth" value={data.dateOfBirth || ''} onChange={handleChange} className={inputCls('dateOfBirth')} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Gender</label>
          <select name="gender" value={data.gender || ''} onChange={handleChange} className={inputCls('gender')}>
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Blood Group</label>
          <select name="bloodGroup" value={data.bloodGroup || ''} onChange={handleChange} className={inputCls('bloodGroup')}>
            <option value="">Select</option>
            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Marital Status</label>
          <select name="maritalStatus" value={data.maritalStatus || ''} onChange={handleChange} className={inputCls('maritalStatus')}>
            <option value="">Select</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Nationality</label>
          <input name="nationality" value={data.nationality || ''} onChange={handleChange} className={inputCls('nationality')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">National ID</label>
          <input name="nationalId" value={data.nationalId || ''} onChange={handleChange} className={inputCls('nationalId')} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Current Address</label>
        <textarea name="currentAddress" value={data.currentAddress || ''} onChange={handleChange} className={inputCls('currentAddress') + " resize-none h-16"} />
      </div>
      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Permanent Address</label>
        <textarea name="permanentAddress" value={data.permanentAddress || ''} onChange={handleChange} className={inputCls('permanentAddress') + " resize-none h-16"} />
      </div>

      {/* Identity Documents */}
      <div className="pt-4 border-t border-surface-200 dark:border-surface-800">
        <h4 className="text-sm font-bold text-secondary-900 dark:text-white mb-4">Identity Documents</h4>
        <div className="grid grid-cols-2 gap-6">
          {/* Aadhaar Details */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Aadhaar Number</label>
            <input name="aadhaarNumber" value={data.aadhaarNumber || ''} onChange={handleChange} className={inputCls('aadhaarNumber')} placeholder="0000 0000 0000" />
            <div className="mt-4">
              <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-2">Aadhaar Card Scan</label>
              <div className="flex items-center gap-4">
                {data.aadhaarScan ? (
                  <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-surface-200 dark:border-surface-700">
                    <img src={data.aadhaarScan} alt="Aadhaar Scan" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => onChange({ ...data, aadhaarScan: null })}
                      className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-black/70">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => aadhaarInputRef.current?.click()}
                    className="w-32 h-24 rounded-lg border-2 border-dashed border-surface-300 dark:border-surface-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex flex-col items-center justify-center cursor-pointer transition-colors">
                    <Upload className="w-5 h-5 text-secondary-400 mb-1" />
                    <span className="text-xs text-secondary-500 font-medium">Upload Scan</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*,application/pdf" 
                  className="hidden" 
                  ref={aadhaarInputRef} 
                  onChange={(e) => handleImageUpload(e, 'aadhaarScan')} 
                />
              </div>
            </div>
          </div>
          
          {/* PAN Details */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">PAN Number</label>
            <input name="panNumber" value={data.panNumber || ''} onChange={handleChange} className={inputCls('panNumber')} placeholder="ABCDE1234F" />
            <div className="mt-4">
              <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-2">PAN Card Scan</label>
              <div className="flex items-center gap-4">
                {data.panScan ? (
                  <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-surface-200 dark:border-surface-700">
                    <img src={data.panScan} alt="PAN Scan" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => onChange({ ...data, panScan: null })}
                      className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-black/70">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => panInputRef.current?.click()}
                    className="w-32 h-24 rounded-lg border-2 border-dashed border-surface-300 dark:border-surface-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex flex-col items-center justify-center cursor-pointer transition-colors">
                    <Upload className="w-5 h-5 text-secondary-400 mb-1" />
                    <span className="text-xs text-secondary-500 font-medium">Upload Scan</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*,application/pdf" 
                  className="hidden" 
                  ref={panInputRef} 
                  onChange={(e) => handleImageUpload(e, 'panScan')} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Passport and Visa Details */}
      <div className="pt-4 border-t border-surface-200 dark:border-surface-800">
        <h4 className="text-sm font-bold text-secondary-900 dark:text-white mb-4">Passport & Visa Details</h4>
        <div className="grid grid-cols-2 gap-6">
          {/* Passport */}
          <div>
            <h5 className="text-sm font-semibold text-secondary-800 dark:text-surface-200 mb-3">Passport Information</h5>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Passport Number</label>
                <input name="passportNumber" value={data.passportNumber || ''} onChange={handleChange} className={inputCls('passportNumber')} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Issue Date</label>
                  <input type="date" name="passportIssueDate" value={data.passportIssueDate || ''} onChange={handleChange} className={inputCls('passportIssueDate')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Expiry Date</label>
                  <input type="date" name="passportExpiryDate" value={data.passportExpiryDate || ''} onChange={handleChange} className={inputCls('passportExpiryDate')} />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-2">Passport Scan</label>
                <div className="flex items-center gap-4">
                  {data.passportScan ? (
                    <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-surface-200 dark:border-surface-700">
                      <img src={data.passportScan} alt="Passport Scan" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => onChange({ ...data, passportScan: null })}
                        className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-black/70">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => passportInputRef.current?.click()}
                      className="w-32 h-24 rounded-lg border-2 border-dashed border-surface-300 dark:border-surface-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex flex-col items-center justify-center cursor-pointer transition-colors">
                      <Upload className="w-5 h-5 text-secondary-400 mb-1" />
                      <span className="text-xs text-secondary-500 font-medium">Upload Scan</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*,application/pdf" 
                    className="hidden" 
                    ref={passportInputRef} 
                    onChange={(e) => handleImageUpload(e, 'passportScan')} 
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Visa */}
          <div>
            <h5 className="text-sm font-semibold text-secondary-800 dark:text-surface-200 mb-3">Visa Information</h5>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Visa Number</label>
                  <input name="visaNumber" value={data.visaNumber || ''} onChange={handleChange} className={inputCls('visaNumber')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Visa Type</label>
                  <input name="visaType" value={data.visaType || ''} onChange={handleChange} className={inputCls('visaType')} placeholder="H1B, B1, etc." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Country</label>
                  <input name="visaCountry" value={data.visaCountry || ''} onChange={handleChange} className={inputCls('visaCountry')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Status</label>
                  <select name="visaStatus" value={data.visaStatus || ''} onChange={handleChange} className={inputCls('visaStatus')}>
                    <option value="">Select</option>
                    <option value="Valid">Valid</option>
                    <option value="Expired">Expired</option>
                    <option value="Processing">Processing</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Issue Date</label>
                  <input type="date" name="visaIssueDate" value={data.visaIssueDate || ''} onChange={handleChange} className={inputCls('visaIssueDate')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Expiry Date</label>
                  <input type="date" name="visaExpiryDate" value={data.visaExpiryDate || ''} onChange={handleChange} className={inputCls('visaExpiryDate')} />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-2">Visa Document</label>
                <div className="flex items-center gap-4">
                  {data.visaDocument ? (
                    <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-surface-200 dark:border-surface-700">
                      <img src={data.visaDocument} alt="Visa Document" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => onChange({ ...data, visaDocument: null })}
                        className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-black/70">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => visaInputRef.current?.click()}
                      className="w-32 h-24 rounded-lg border-2 border-dashed border-surface-300 dark:border-surface-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex flex-col items-center justify-center cursor-pointer transition-colors">
                      <Upload className="w-5 h-5 text-secondary-400 mb-1" />
                      <span className="text-xs text-secondary-500 font-medium">Upload Scan</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*,application/pdf" 
                    className="hidden" 
                    ref={visaInputRef} 
                    onChange={(e) => handleImageUpload(e, 'visaDocument')} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disability Details */}
      <div className="pt-4 border-t border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 mb-4">
          <input 
            type="checkbox" 
            id="isPersonWithDisability"
            name="isPersonWithDisability" 
            checked={data.isPersonWithDisability || false} 
            onChange={handleChange} 
            className="w-4 h-4 text-primary-600 rounded border-surface-300 focus:ring-primary-500" 
          />
          <label htmlFor="isPersonWithDisability" className="text-sm font-medium text-secondary-900 dark:text-white">
            Is Person with Disability?
          </label>
        </div>
        
        {data.isPersonWithDisability && (
          <div className="grid grid-cols-2 gap-4 animate-fade-in pl-7">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Disability Type</label>
              <input name="disabilityType" value={data.disabilityType || ''} onChange={handleChange} className={inputCls('disabilityType')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Disability Percentage / Note</label>
              <input name="disabilityPercentage" value={data.disabilityPercentage || ''} onChange={handleChange} className={inputCls('disabilityPercentage')} />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
