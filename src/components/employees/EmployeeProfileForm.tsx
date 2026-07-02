import { useState, useEffect } from 'react';
import {
  User, Briefcase, DollarSign, GraduationCap,
  Activity, HeartPulse, Paperclip, Laptop,
  ChevronRight, ChevronLeft, Save, CheckCircle, X
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/formatters';

// Import sub-forms (we will create these next)
import PersonalInfoForm from './sections/PersonalInfoForm';
import JobDetailsForm from './sections/JobDetailsForm';
import SalaryForm from './sections/SalaryForm';
import EducationForm from './sections/EducationForm';
import ExperienceForm from './sections/ExperienceForm';
import EmergencyContactForm from './sections/EmergencyContactForm';
import AttachmentsForm from './sections/AttachmentsForm';
import AssetsForm from './sections/AssetsForm';
import CertificationsForm from './sections/CertificationsForm';
import { Award } from 'lucide-react';

interface EmployeeProfileFormProps {
  initialData?: any; // If editing, pass existing employee data
  onClose: () => void;
  onSaved: () => void;
}

export type FormState = {
  personal: any;
  job: any;
  salary: any;
  education: any[];
  experience: any[];
  certifications: any[];
  emergency: any[];
  attachments: any[];
  assets: any[];
};

const SECTIONS = [
  { id: 'personal', label: 'Personal Info', icon: User, required: true },
  { id: 'job', label: 'Job Details', icon: Briefcase, required: true },
  { id: 'salary', label: 'Salary Info', icon: DollarSign, adminOnly: true },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'experience', label: 'Experience', icon: Activity },
  { id: 'certifications', label: 'Certifications', icon: Award },
  { id: 'emergency', label: 'Emergency Contacts', icon: HeartPulse },
  { id: 'attachments', label: 'Attachments', icon: Paperclip },
  { id: 'assets', label: 'Assets', icon: Laptop },
];

export default function EmployeeProfileForm({ initialData, onClose, onSaved }: EmployeeProfileFormProps) {
  const { isAdmin } = useAuth();

  // Filter sections based on permissions
  const sections = SECTIONS.filter(s => !s.adminOnly || isAdmin);

  const [activeStep, setActiveStep] = useState(0);
  // Normalize array items to camelCase (handles both fresh DB data and re-edits)
  const normalizeEducation = (e: any) => ({
    ...e,
    yearOfPassing: e.yearOfPassing || e.year_of_passing || '',
    degree: e.degree || '',
    institution: e.institution || e.university || '',
    grade: e.grade || e.percentage_or_cgpa || '',
  });
  const normalizeExperience = (e: any) => ({
    ...e,
    companyName: e.companyName || e.company_name || '',
    jobTitle: e.jobTitle || e.designation || '',
    startDate: e.startDate || e.start_date || '',
    endDate: e.endDate || e.end_date || '',
    description: e.description || e.responsibilities || '',
  });
  const normalizeCertification = (e: any) => ({
    ...e,
    certificationName: e.certificationName || e.certification_name || '',
    issuingOrganization: e.issuingOrganization || e.issuing_organization || '',
    issueDate: e.issueDate || e.issue_date || '',
    expiryDate: e.expiryDate || e.expiry_date || '',
  });
  const normalizeSalary = (s: any) => ({
    ...s,
    baseSalary: s.baseSalary ?? s.basicSalary ?? s.basic_salary ?? '',
    currency: s.currency || 'USD',
    bankName: s.bankName || s.bank_name || '',
    bankAccountNumber: s.bankAccountNumber || s.accountNumber || s.account_number || '',
    routingNumber: s.routingNumber || s.ifscCode || s.ifsc_code || '',
    taxId: s.taxId || s.tax_id || '',
  });
  const normalizeAttachment = (a: any) => ({
    ...a,
    name: a.name || a.fileName || a.file_name || a.documentName || a.document_name || 'Document',
    size: a.size ?? a.fileSize ?? a.file_size ?? 0,
    type: a.type || a.mimeType || a.mime_type || '',
    url: a.url || a.filePath || a.file_path || '',
    category: a.category || a.documentType || a.document_type || 'Other Documents',
  });

  const [formData, setFormData] = useState<FormState>({
    personal: initialData?.personal || {},
    job: initialData?.job || {},
    salary: normalizeSalary(initialData?.salary || {}),
    education: (initialData?.education || []).map(normalizeEducation),
    experience: (initialData?.experience || []).map(normalizeExperience),
    certifications: (initialData?.certifications || []).map(normalizeCertification),
    emergency: initialData?.emergency || [],
    attachments: (initialData?.attachments || []).map(normalizeAttachment),
    assets: initialData?.assets || [],
  });

  const [errors, setErrors] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'draft' | 'saved' | 'error'>('idle');
  const [createdEmpId, setCreatedEmpId] = useState<string | null>(null);
  const [failedSections, setFailedSections] = useState<string[]>([]);

  // Calculate progress
  const progress = Math.round(((activeStep + 1) / sections.length) * 100);

  const updateSectionData = (section: keyof FormState, data: any) => {
    setFormData(prev => ({ ...prev, [section]: data }));
    // Clear errors for this section
    setErrors(prev => ({ ...prev, [section]: null }));
  };

  const validateCurrentStep = (): boolean => {
    // Basic validation implementation
    const currentSection = sections[activeStep].id;
    let newErrors: any = {};
    let isValid = true;

    if (currentSection === 'personal') {
      const data = formData.personal;
      if (!data.firstName) { newErrors.firstName = 'First Name is required'; isValid = false; }
      if (!data.lastName) { newErrors.lastName = 'Last Name is required'; isValid = false; }
      if (!data.officialEmail) { newErrors.officialEmail = 'Official Email is required'; isValid = false; }
    } else if (currentSection === 'job') {
      const data = formData.job;
      if (!data.employeeId) { newErrors.employeeId = 'Employee ID is required'; isValid = false; }
      if (!data.departmentId) { newErrors.departmentId = 'Department is required'; isValid = false; }
    }

    setErrors(prev => ({ ...prev, [currentSection]: newErrors }));
    return isValid;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (activeStep < sections.length - 1) {
        setActiveStep(s => s + 1);
      } else {
        handleSave(false);
      }
    }
  };

  const handlePrev = () => {
    if (activeStep > 0) setActiveStep(s => s - 1);
  };

  const handleSave = async (isDraft = true) => {
    // Drafts don't require full validation of current step, but final submit does
    if (!isDraft && !validateCurrentStep()) return;

    setIsSaving(true);
    setSaveStatus('idle');
    const errors: string[] = [];

    try {
      let empId = initialData?.id || createdEmpId;

      // 1. Create Base Employee if new
      if (!empId) {
        const basePayload = {
          officialEmail: formData.personal.officialEmail,
          firstName: formData.personal.firstName,
          lastName: formData.personal.lastName,
          employeeId: formData.job.employeeId,
          departmentId: formData.job.departmentId,
          designation: formData.job.designation,
          role: formData.job.role || 'employee',
          joiningDate: formData.job.joiningDate,
          mobileNumber: formData.personal.phone,
          dateOfBirth: formData.personal.dateOfBirth,
          gender: formData.personal.gender,
        };
        const res = await api.post('/api/employees', basePayload);
        empId = res.id;
        setCreatedEmpId(res.id);
      }

      // 2. Update Personal Details
      try {
        if (Object.keys(formData.personal).length > 0) {
          const personalPayload: Record<string, any> = {
            firstName: formData.personal.firstName,
            lastName: formData.personal.lastName,
            officialEmail: formData.personal.officialEmail,
            personalEmail: formData.personal.personalEmail,
            mobileNumber: formData.personal.phone,
            dateOfBirth: formData.personal.dateOfBirth,
            gender: formData.personal.gender,
            bloodGroup: formData.personal.bloodGroup,
            maritalStatus: formData.personal.maritalStatus,
            nationality: formData.personal.nationality,
            nationalId: formData.personal.nationalId,
            currentAddress: formData.personal.currentAddress,
            permanentAddress: formData.personal.permanentAddress,
            isPersonWithDisability: formData.personal.isPersonWithDisability === 'Yes' || formData.personal.isPersonWithDisability === true,
            disabilityType: formData.personal.disabilityType,
            disabilityPercentage: formData.personal.disabilityPercentage,
            aadhaarNumber: formData.personal.aadhaarNumber,
            panNumber: formData.personal.panNumber,
            visaNumber: formData.personal.visaNumber,
            visaType: formData.personal.visaType,
            visaCountry: formData.personal.visaCountry,
            visaIssueDate: formData.personal.visaIssueDate,
            visaExpiryDate: formData.personal.visaExpiryDate,
            visaStatus: formData.personal.visaStatus,
            passportNumber: formData.personal.passportNumber,
            passportIssueDate: formData.personal.passportIssueDate,
            passportExpiryDate: formData.personal.passportExpiryDate,
          };
          if (formData.personal.profilePicture) {
            personalPayload.profilePicture = formData.personal.profilePicture;
          }
          if (formData.personal.passportScan) {
            personalPayload.passportScan = formData.personal.passportScan;
          }
          await api.put(`/api/employees/${empId}/personal`, personalPayload);

          // Handle explicit Aadhaar/PAN/Visa scan uploads into attachments table
          const extraScans = [
            { key: 'aadhaarScan', type: 'Aadhaar Card', name: 'Aadhaar Scan' },
            { key: 'panScan', type: 'PAN Card', name: 'PAN Scan' },
            { key: 'visaDocument', type: 'Visa Document', name: 'Visa Document' }
          ];
          for (const scan of extraScans) {
            if (formData.personal[scan.key]) {
              try {
                await api.post(`/api/employees/${empId}/attachments`, {
                  document_type: scan.type,
                  document_name: scan.name,
                  file_name: scan.name,
                  file_path: formData.personal[scan.key],
                  file_size: 0,
                  mime_type: 'image/png'
                });
              } catch (e: any) { console.warn(`[Save] Scan upload failed (${scan.name}):`, e.message); }
            }
          }
        }
      } catch (e: any) {
        console.error('[Save] Personal update failed:', e.message);
        errors.push(`Personal info: ${e.message || 'unknown error'}`);
      }

      // 3. Update Job Details
      try {
        if (Object.keys(formData.job).length > 0) {
          const jobPayload = {
            designation: formData.job.designation,
            department_id: formData.job.departmentId || null,
            reporting_manager_id: formData.job.reportingManagerId || null,
            joining_date: formData.job.joiningDate,
            employment_type: formData.job.employmentType,
            employment_status: formData.job.employmentStatus || 'Active',
            work_location: formData.job.workLocation,
            role: formData.job.role,
          };
          await api.put(`/api/employees/${empId}/job`, jobPayload);
        }
      } catch (e: any) {
        console.error('[Save] Job update failed:', e.message);
        errors.push(`Job details: ${e.message || 'unknown error'}`);
      }

      // 4. Update Salary Details (Admin only)
      try {
        if (isAdmin && Object.keys(formData.salary).length > 0) {
          const salaryPayload = {
            basic_salary: formData.salary.baseSalary,
            currency: formData.salary.currency || 'USD',
            bank_name: formData.salary.bankName,
            account_number: formData.salary.bankAccountNumber,
            ifsc_code: formData.salary.routingNumber,
            tax_id: formData.salary.taxId,
          };
          await api.put(`/api/employees/${empId}/salary`, salaryPayload);
        }
      } catch (e: any) {
        console.error('[Save] Salary update failed:', e.message);
        errors.push(`Salary: ${e.message || 'unknown error'}`);
      }

      // 5. Save Education
      try {
        for (const edu of formData.education) {
          if (!edu.id) {
            const savedEdu = await api.post(`/api/employees/${empId}/education`, {
              degree: edu.degree,
              institution: edu.institution,
              year_of_passing: edu.yearOfPassing,
              grade: edu.grade,
            });
            edu.id = savedEdu.id; // Mark as saved so it won't be re-saved
          }
        }
      } catch (e: any) {
        console.error('[Save] Education save failed:', e.message);
        errors.push(`Education: ${e.message || 'unknown error'}`);
      }

      // 6. Save Experience
      try {
        for (const exp of formData.experience) {
          if (!exp.id) {
            const savedExp = await api.post(`/api/employees/${empId}/experience`, {
              company_name: exp.companyName,
              designation: exp.jobTitle || exp.designation,
              start_date: exp.startDate,
              end_date: exp.endDate,
              responsibilities: exp.description || exp.responsibilities,
            });
            exp.id = savedExp.id;
            if (exp.document) {
              try {
                await api.post(`/api/employees/${empId}/attachments`, {
                  document_type: 'Experience Certificates',
                  document_name: `Experience - ${exp.companyName}`,
                  file_name: `experience_${exp.companyName}`,
                  file_path: exp.document,
                  file_size: 0,
                  mime_type: 'image/png'
                });
              } catch (e: any) { console.warn('[Save] Experience doc upload failed:', e.message); }
            }
          }
        }
      } catch (e: any) {
        console.error('[Save] Experience save failed:', e.message);
        errors.push(`Experience: ${e.message || 'unknown error'}`);
      }

      // 7. Save Certifications
      try {
        for (const cert of formData.certifications) {
          if (!cert.id) {
            if (!cert.certificationName || !cert.issuingOrganization) {
              // Skip incomplete rows instead of sending a request that the
              // database will reject (certification_name and
              // issuing_organization are required).
              continue;
            }
            const savedCert = await api.post(`/api/employees/${empId}/certifications`, {
              certification_name: cert.certificationName,
              issuing_organization: cert.issuingOrganization,
              issue_date: cert.issueDate,
              expiry_date: cert.expiryDate || null,
            });
            cert.id = savedCert.id;
            if (cert.document) {
              try {
                await api.post(`/api/employees/${empId}/attachments`, {
                  document_type: 'Educational Certificates',
                  document_name: `Certification - ${cert.certificationName}`,
                  file_name: `certification_${cert.certificationName}`,
                  file_path: cert.document,
                  file_size: 0,
                  mime_type: 'image/png'
                });
              } catch (e: any) { console.warn('[Save] Cert doc upload failed:', e.message); }
            }
          }
        }
      } catch (e: any) {
        console.error('[Save] Certifications save failed:', e.message);
        errors.push(`Certifications: ${e.message || 'unknown error'}`);
      }

      // 8. Save Emergency Contacts
      try {
        for (const contact of formData.emergency) {
          if (!contact.id) {
            const savedContact = await api.post(`/api/employees/${empId}/emergency-contacts`, {
              contact_name: contact.name || contact.contactName,
              relationship: contact.relationship,
              mobile_number: contact.phone || contact.mobileNumber,
              alternate_number: contact.alternativePhone || contact.alternateNumber,
            });
            contact.id = savedContact.id;
          }
        }
      } catch (e: any) {
        console.error('[Save] Emergency contacts save failed:', e.message);
        errors.push(`Emergency contacts: ${e.message || 'unknown error'}`);
      }

      // 9. Save Attachments
      try {
        for (const attachment of formData.attachments) {
          if (!attachment.id) {
            const validTypes = ['Profile Photo', 'Resume / CV', 'Aadhaar Card', 'PAN Card', 'Passport', 'Passport Visa', 'Driving License', 'Educational Certificates', 'Experience Certificates', 'Offer Letter', 'Appointment Letter', 'Salary Slips', 'Relieving Letter', 'Medical Certificate', 'Disability Certificate', 'Police Verification', 'Other Documents'];
            let mappedCategory = attachment.category;
            if (mappedCategory === 'Educational Certificate') mappedCategory = 'Educational Certificates';
            if (mappedCategory === 'Experience Letter') mappedCategory = 'Experience Certificates';
            if (!validTypes.includes(mappedCategory)) mappedCategory = 'Other Documents';

            const savedAttachment = await api.post(`/api/employees/${empId}/attachments`, {
              document_type: mappedCategory,
              document_name: attachment.name,
              file_name: attachment.name,
              file_path: attachment.url || `/uploads/${attachment.name}`,
              file_size: attachment.size,
              mime_type: attachment.type,
            });
            attachment.id = savedAttachment.id;
          }
        }
      } catch (e: any) {
        console.error('[Save] Attachments save failed:', e.message);
        errors.push(`Attachments: ${e.message || 'unknown error'}`);
      }

      // 10. Save Assets
      try {
        for (const asset of formData.assets) {
          if (!asset.id && asset.fromPool && asset.assetId) {
            await api.post('/api/assets/assign', {
              assetId: asset.assetId,
              employeeId: empId,
            });
          } else if (!asset.id && !asset.fromPool) {
            await api.post(`/api/employees/${empId}/assets`, {
              asset_name: asset.assetName,
              asset_category: asset.assetType,
              serial_number: asset.serialNumber,
              assigned_date: asset.issueDate,
              status: asset.status ? asset.status.charAt(0).toUpperCase() + asset.status.slice(1).toLowerCase() : 'Assigned',
            });
          }
        }
      } catch (e: any) {
        console.error('[Save] Assets save failed:', e.message);
        errors.push(`Assets: ${e.message || 'unknown error'}`);
      }

      setFailedSections(errors);

      if (errors.length > 0) {
        console.warn('[Save] Partial save - failed sections:', errors);
        setSaveStatus('error');
        alert(
          'Some sections could not be saved:\n\n' +
          errors.join('\n') +
          '\n\nThe rest of the profile was saved, but please fix the issue above and try saving again for the failed section(s).'
        );
      } else {
        setSaveStatus(isDraft ? 'draft' : 'saved');
      }

      // Only auto-close on a fully clean save. If something failed, keep the
      // form open so the person can see the error and retry instead of
      // silently losing data.
      if (!isDraft && errors.length === 0) {
        setTimeout(() => {
          onSaved();
        }, 1500);
      }
    } catch (err: any) {
      console.error('[Save] Critical error (employee creation failed):', err);
      setSaveStatus('error');
      alert(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const CurrentIcon = sections[activeStep].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-6xl h-[90vh] bg-white dark:bg-surface-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in border border-surface-200 dark:border-surface-800">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50">
          <div>
            <h2 className="text-xl font-bold text-secondary-900 dark:text-white">
              {initialData ? 'Edit Employee Profile' : 'Add New Employee'}
            </h2>
            <p className="text-sm text-secondary-500 mt-1">Complete all sections to create a comprehensive profile.</p>
          </div>
          <div className="flex items-center gap-4">
            {saveStatus === 'draft' && <span className="text-sm text-primary-600 font-medium flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Draft saved</span>}
            {saveStatus === 'error' && failedSections.length > 0 && (
              <span className="text-sm text-error-600 font-medium max-w-xs text-right">
                Failed to save: {failedSections.map(f => f.split(':')[0]).join(', ')}
              </span>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-secondary-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar / Stepper */}
          <div className="w-64 border-r border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/20 overflow-y-auto">
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs font-semibold text-secondary-500 mb-2">
                  <span>Profile Completion</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                {sections.map((section, idx) => {
                  const Icon = section.icon;
                  const isActive = activeStep === idx;
                  const isCompleted = activeStep > idx;

                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        // Only allow jumping if valid or going backwards
                        if (idx < activeStep || validateCurrentStep()) {
                          setActiveStep(idx);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                        isActive
                          ? "bg-white dark:bg-surface-800 text-primary-600 shadow-sm border border-surface-200 dark:border-surface-700"
                          : "text-secondary-600 hover:bg-surface-200 dark:hover:bg-surface-800/50 hover:text-secondary-900"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg",
                        isActive ? "bg-primary-50 text-primary-600" : isCompleted ? "bg-success-50 text-success-600" : "bg-surface-100 text-secondary-400"
                      )}>
                        {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className="flex-1">{section.label}</span>
                      {section.required && <span className="text-error-500 text-lg">*</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Form Content */}
          <div className="flex-1 flex flex-col bg-white dark:bg-surface-900 relative">
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">

                <div className="flex items-center gap-3 pb-6 border-b border-surface-200 dark:border-surface-800">
                  <div className="p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-xl">
                    <CurrentIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-secondary-900 dark:text-white">{sections[activeStep].label}</h3>
                    <p className="text-sm text-secondary-500">Provide the required details below.</p>
                  </div>
                </div>

                {/* Form Sections Router */}
                {sections[activeStep].id === 'personal' && (
                  <PersonalInfoForm data={formData.personal} errors={errors.personal} onChange={(d: any) => updateSectionData('personal', d)} />
                )}
                {sections[activeStep].id === 'job' && (
                  <JobDetailsForm data={formData.job} errors={errors.job} onChange={(d: any) => updateSectionData('job', d)} />
                )}
                {sections[activeStep].id === 'salary' && (
                  <SalaryForm data={formData.salary} errors={errors.salary} onChange={(d: any) => updateSectionData('salary', d)} />
                )}
                {sections[activeStep].id === 'education' && (
                  <EducationForm data={formData.education} errors={errors.education} onChange={(d: any) => updateSectionData('education', d)} />
                )}
                {sections[activeStep].id === 'experience' && (
                  <ExperienceForm data={formData.experience} errors={errors.experience} onChange={(d: any) => updateSectionData('experience', d)} />
                )}
                {sections[activeStep].id === 'certifications' && (
                  <CertificationsForm data={formData.certifications} errors={errors.certifications} onChange={(d: any) => updateSectionData('certifications', d)} />
                )}
                {sections[activeStep].id === 'emergency' && (
                  <EmergencyContactForm data={formData.emergency} errors={errors.emergency} onChange={(d: any) => updateSectionData('emergency', d)} />
                )}
                {sections[activeStep].id === 'attachments' && (
                  <AttachmentsForm data={formData.attachments} errors={errors.attachments} onChange={(d: any) => updateSectionData('attachments', d)} />
                )}
                {sections[activeStep].id === 'assets' && (
                  <AssetsForm employeeId={initialData?.id} data={formData.assets} errors={errors.assets} onChange={(d: any) => updateSectionData('assets', d)} />
                )}

              </div>
            </div>

            {/* Footer / Controls */}
            <div className="px-8 py-5 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex items-center justify-between flex-shrink-0">
              <button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="btn-secondary flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save as Draft
              </button>

              <div className="flex gap-3">
                <button
                  onClick={handlePrev}
                  disabled={activeStep === 0 || isSaving}
                  className="btn-secondary px-6"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={isSaving}
                  className="btn-primary px-8"
                >
                  {activeStep === sections.length - 1 ? (
                    <>{isSaving ? 'Saving...' : 'Complete Profile'} <CheckCircle className="w-4 h-4 ml-1" /></>
                  ) : (
                    <>Next <ChevronRight className="w-4 h-4 ml-1" /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}