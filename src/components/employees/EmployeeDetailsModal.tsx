import { Fragment, useEffect } from 'react';
import { Clock, X } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import type { Asset, AssetAssignment } from '../../types';

type EmployeeDetailRecord = Record<string, unknown>;

interface EmployeeDetailsModalProps {
  employee: EmployeeDetailRecord;
  departmentName?: string;
  managerName?: string;
  emergencyContacts: EmployeeDetailRecord[];
  assets: { asset: Pick<Asset, 'id' | 'name' | 'assetType' | 'serialNumber'>; assignment: Pick<AssetAssignment, 'id'> }[];
  onClose: () => void;
}

function asRecord(value: unknown): EmployeeDetailRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as EmployeeDetailRecord
    : null;
}

function asRecordList(value: unknown): EmployeeDetailRecord[] {
  return Array.isArray(value)
    ? value.map(asRecord).filter((item): item is EmployeeDetailRecord => item !== null)
    : [];
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return '—';
  return String(value);
}

function displayDate(value: unknown): string {
  return typeof value === 'string' && value ? formatDate(value) : '—';
}

function getDocumentUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return /^(https?:\/\/|data:image\/|data:application\/pdf;|\/)/i.test(value) ? value : null;
}

function DetailSection({ title, fields }: { title: string; fields: [string, unknown][] }) {
  const visibleFields = fields.filter(([, value]) => value !== null && value !== undefined && value !== '');
  if (!visibleFields.length) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold text-secondary-900 border-b border-secondary-100 pb-2">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {visibleFields.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-400">{label}</p>
            <p className="text-sm font-medium text-secondary-800 mt-1 whitespace-pre-wrap break-words">{displayValue(value)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function EmployeeDetailsModal({
  employee,
  departmentName,
  managerName,
  emergencyContacts,
  assets,
  onClose,
}: EmployeeDetailsModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const shiftStart = typeof employee.shiftStartTime === 'string' ? employee.shiftStartTime.slice(0, 5) : '';
  const shiftEnd = typeof employee.shiftEndTime === 'string' ? employee.shiftEndTime.slice(0, 5) : '';
  const education = asRecordList(employee.education);
  const experience = asRecordList(employee.experience);
  const certifications = asRecordList(employee.certifications);
  const attachments = asRecordList(employee.attachments);
  const salary = asRecord(employee.salaryDetails);
  const profileDocuments: [string, unknown][] = [
    ['Passport Scan', employee.passportScan],
    ['Profile Picture', employee.profilePicture],
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6" role="presentation">
      <button aria-label="Close employee details" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-details-title"
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-secondary-100 bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-secondary-100 px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <h2 id="employee-details-title" className="text-lg font-bold text-secondary-900 truncate">
              {displayValue(employee.firstName)} {displayValue(employee.lastName)}
            </h2>
            <p className="mt-0.5 text-sm text-secondary-500">Complete employee details</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-secondary-500 hover:bg-secondary-100">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-7 overflow-y-auto p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary-100 bg-primary-50 p-4">
            <Clock className="h-4 w-4 text-primary-600" />
            <span className="text-sm font-semibold text-secondary-700">Shift hours</span>
            <span className="text-sm font-bold text-primary-700">
              {shiftStart && shiftEnd ? `${shiftStart} – ${shiftEnd}` : 'Not set'}
            </span>
          </div>

          <DetailSection title="Personal & Contact Information" fields={[
            ['Employee ID', employee.employeeId],
            ['Official Email', employee.email || employee.officialEmail],
            ['Personal Email', employee.personalEmail],
            ['Mobile Number', employee.mobileNumber],
            ['Alternate Mobile Number', employee.alternateMobileNumber],
            ['Date of Birth', displayDate(employee.dateOfBirth)],
            ['Gender', employee.gender],
            ['Blood Group', employee.bloodGroup],
            ['Marital Status', employee.maritalStatus],
            ['Nationality', employee.nationality],
            ['Religion', employee.religion],
            ['Languages Known', employee.languagesKnown],
            ['Bio', employee.bio],
          ]} />

          <DetailSection title="Job & Shift Information" fields={[
            ['Designation', employee.designation],
            ['Department', departmentName || asRecord(employee.department)?.name],
            ['System Role', employee.role],
            ['Employment Status', employee.employmentStatus || employee.status],
            ['Employment Type', employee.employmentType],
            ['Joining Date', displayDate(employee.joiningDate)],
            ['Confirmation Date', displayDate(employee.confirmationDate)],
            ['Work Location', employee.workLocation],
            ['Work Mode', employee.workMode],
            ['Reporting Manager', managerName],
            ['Shift Label', employee.shift],
            ['Shift Start Time', shiftStart],
            ['Shift End Time', shiftEnd],
            ['Branch', employee.branch],
            ['Cost Center', employee.costCenter],
            ['Probation End Date', displayDate(employee.probationEndDate)],
            ['Notice Period (Days)', employee.noticePeriodDays],
            ['Exit Date', displayDate(employee.exitDate)],
            ['Job Remarks', employee.remarks],
          ]} />

          <DetailSection title="Address" fields={[
            ['Current Address', employee.currentAddress || employee.address],
            ['Permanent Address', employee.permanentAddress],
            ['City', employee.city],
            ['State', employee.state],
            ['Country', employee.country],
            ['Postal Code', employee.postalCode],
          ]} />

          <DetailSection title="Identity & Travel Documents" fields={[
            ['National ID', employee.nationalId],
            ['Aadhaar Number', employee.aadhaarNumber],
            ['PAN Number', employee.panNumber],
            ['Passport Number', employee.passportNumber],
            ['Passport Issue Date', displayDate(employee.passportIssueDate)],
            ['Passport Expiry Date', displayDate(employee.passportExpiryDate)],
            ['Visa Number', employee.visaNumber],
            ['Visa Type', employee.visaType],
            ['Visa Country', employee.visaCountry],
            ['Visa Issue Date', displayDate(employee.visaIssueDate)],
            ['Visa Expiry Date', displayDate(employee.visaExpiryDate)],
            ['Visa Status', employee.visaStatus],
          ]} />

          <DetailSection title="Workplace Accommodation" fields={[
            ['Person with Disability', employee.isPersonWithDisability],
            ['Disability Type', employee.disabilityType],
            ['Disability Percentage / Note', employee.disabilityPercentage],
            ['Accommodation Required', employee.requiresWorkplaceAccommodation],
            ['Accommodation Details', employee.accommodationDetails],
          ]} />

          {salary && (
            <DetailSection title="Salary & Bank Information" fields={[
              ['Basic Salary', salary.basicSalary ?? salary.baseSalary],
              ['Gross Salary', salary.grossSalary],
              ['CTC', salary.ctc],
              ['HRA', salary.hra],
              ['Other Allowances', salary.otherAllowances],
              ['Currency', salary.currency],
              ['Bank Name', salary.bankName],
              ['Bank Account Number', salary.accountNumber || salary.bankAccountNumber],
              ['IFSC / Routing Number', salary.ifscCode || salary.routingNumber],
              ['Tax ID', salary.taxId],
            ]} />
          )}

          {emergencyContacts.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-secondary-900 border-b border-secondary-100 pb-2">Emergency Contacts</h3>
              {emergencyContacts.map((contact, index) => (
                <DetailSection key={displayValue(contact.id) !== '—' ? displayValue(contact.id) : index} title={`Contact ${index + 1}`} fields={[
                  ['Name', contact.name],
                  ['Relationship', contact.relationship],
                  ['Phone', contact.phone],
                  ['Alternative Phone', contact.alternativePhone],
                ]} />
              ))}
            </section>
          )}

          {education.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-secondary-900 border-b border-secondary-100 pb-2">Education</h3>
              {education.map((item, index) => (
                <DetailSection key={displayValue(item.id) !== '—' ? displayValue(item.id) : index} title={displayValue(item.degree) !== '—' ? displayValue(item.degree) : `Education ${index + 1}`} fields={[
                  ['Institution', item.institution || item.university],
                  ['Year of Passing', item.yearOfPassing || item.year_of_passing || item.year],
                  ['Grade / CGPA', item.grade],
                ]} />
              ))}
            </section>
          )}

          {experience.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-secondary-900 border-b border-secondary-100 pb-2">Experience</h3>
              {experience.map((item, index) => (
                <Fragment key={displayValue(item.id) !== '—' ? displayValue(item.id) : index}>
                <DetailSection title={displayValue(item.companyName || item.company_name) !== '—' ? displayValue(item.companyName || item.company_name) : `Experience ${index + 1}`} fields={[
                  ['Job Title', item.jobTitle || item.designation],
                  ['Start Date', displayDate(item.startDate || item.start_date)],
                  ['End Date', displayDate(item.endDate || item.end_date)],
                  ['Responsibilities', item.description || item.responsibilities],
                ]} />
                {getDocumentUrl(item.document) && (
                  <a href={getDocumentUrl(item.document) || undefined} target="_blank" rel="noreferrer" className="inline-block text-xs font-semibold text-primary-600 hover:text-primary-700">
                    Open experience document
                  </a>
                )}
                </Fragment>
              ))}
            </section>
          )}

          {certifications.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-secondary-900 border-b border-secondary-100 pb-2">Certifications</h3>
              {certifications.map((item, index) => (
                <Fragment key={displayValue(item.id) !== '—' ? displayValue(item.id) : index}>
                <DetailSection title={displayValue(item.certificationName) !== '—' ? displayValue(item.certificationName) : `Certification ${index + 1}`} fields={[
                  ['Issuing Organization', item.issuingOrganization],
                  ['Issue Date', displayDate(item.issueDate)],
                  ['Expiry Date', displayDate(item.expiryDate)],
                ]} />
                {getDocumentUrl(item.document) && (
                  <a href={getDocumentUrl(item.document) || undefined} target="_blank" rel="noreferrer" className="inline-block text-xs font-semibold text-primary-600 hover:text-primary-700">
                    Open certificate document
                  </a>
                )}
                </Fragment>
              ))}
            </section>
          )}

          {Array.isArray(employee.skills) && employee.skills.length > 0 && (
            <DetailSection title="Skills" fields={ [['Skills', employee.skills]] } />
          )}

          {attachments.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-secondary-900 border-b border-secondary-100 pb-2">Attachments</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {attachments.map((item, index) => {
                  const path = getDocumentUrl(item.filePath || item.url);
                  return (
                    <div key={displayValue(item.id) !== '—' ? displayValue(item.id) : index} className="rounded-lg border border-secondary-100 bg-secondary-50 p-3">
                      <p className="text-sm font-semibold text-secondary-800">{displayValue(item.documentName || item.fileName || item.name) !== '—' ? displayValue(item.documentName || item.fileName || item.name) : `Attachment ${index + 1}`}</p>
                      <p className="mt-1 text-xs text-secondary-500">{displayValue(item.documentType || item.mimeType || item.type) !== '—' ? displayValue(item.documentType || item.mimeType || item.type) : 'Document'}</p>
                      {path && (
                        <a href={path} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-primary-600 hover:text-primary-700">
                          Open attachment
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h3 className="text-sm font-bold text-secondary-900 border-b border-secondary-100 pb-2">Profile Documents</h3>
            <div className="flex flex-wrap gap-4">
              {profileDocuments.map(([label, value]) => {
                const url = getDocumentUrl(value);
                return url ? (
                  <a key={label} href={url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                    Open {label}
                  </a>
                ) : null;
              })}
            </div>
          </section>

          {assets.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-secondary-900 border-b border-secondary-100 pb-2">Assigned Assets</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {assets.map(({ asset, assignment }, index) => (
                  <div key={displayValue(assignment.id || asset.id) !== '—' ? displayValue(assignment.id || asset.id) : index} className="rounded-lg border border-secondary-100 bg-secondary-50 p-3">
                    <p className="text-sm font-semibold text-secondary-800">{displayValue(asset.name) !== '—' ? displayValue(asset.name) : 'Asset'}</p>
                    <p className="mt-1 text-xs text-secondary-500">
                      {[asset.assetType, asset.serialNumber && `S/N: ${asset.serialNumber}`].filter(Boolean).join(' · ') || 'Details not set'}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="flex justify-end border-t border-secondary-100 px-5 py-4 sm:px-7">
          <button onClick={onClose} className="rounded-lg bg-secondary-900 px-4 py-2 text-sm font-semibold text-white hover:bg-secondary-800">
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
