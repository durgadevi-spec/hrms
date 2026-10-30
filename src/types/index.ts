export type Role = 'admin' | 'employee' | 'manager' | 'hr' | 'it_support';
export type EmployeeStatus = 'active' | 'inactive' | 'on_leave';
export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'delayed';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type LeaveType = 'paid_leave' | 'sick_leave' | 'loss_of_pay' | 'other';
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
// Asset types are now a dynamic, admin-managed list (see AssetsContext) rather
// than a hardcoded union, so new types added from the Assets page type-check fine.
export type AssetType = string;
export type AssetStatus = 'available' | 'assigned' | 'maintenance' | 'damaged' | 'lost' | 'retired' | 'disposed';
export type NotificationType = 'leave' | 'timesheet' | 'task' | 'asset' | 'system';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';

export interface EducationDetail {
  degree: string;
  institution: string;
  year: string;
  grade?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  managerIds: string[];
  createdAt: string;
}

export interface Employee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  departmentId: string | null;
  department?: Department;
  designation: string;
  role: Role;
  status: EmployeeStatus;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
  joiningDate: string;
  reportingManagerId: string | null;
  reportingManager?: Employee | null;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
  profileImageUrl: string | null;
  paidLeaveBalance: number;
  sickLeaveBalance: number;
  // Extended fields
  bio: string | null;
  bloodGroup: BloodGroup | null;
  maritalStatus: MaritalStatus | null;
  nationality: string | null;
  gender: string | null;
  skills: string[];
  education: EducationDetail[];
  emergencyContact: EmergencyContact | null;
  // Deactivation
  deactivationReason: string | null;
  deactivatedAt: string | null;
  deactivatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string;
  endDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  project?: Project;
  employeeId: string;
  employee?: Employee;
  roleInProject: string;
  assignedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  projectId: string | null;
  project?: Project;
  assignedTo: string | null;
  assignee?: Employee;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Timesheet {
  id: string;
  employeeId: string;
  employee?: Employee;
  date: string;
  hoursWorked: number;
  projectId: string | null;
  project?: Project;
  taskDescription: string | null;
  status: TimesheetStatus;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?: Employee;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: LeaveRequestStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetDocument {
  name: string;
  size: number;
  type: string;
  url: string; // base64 data URL
}

export interface Asset {
  id: string;
  name: string;
  assetType: AssetType;
  category: string | null;
  assetCode: string | null;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  processor: string | null;
  ram: string | null;
  storageType: string | null;
  storageCapacity: string | null;
  operatingSystem: string | null;
  graphicsCard: string | null;
  displaySize: string | null;
  purchaseDate: string | null;
  purchaseCost: number | null;
  vendor: string | null;
  invoiceNumber: string | null;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
  location: string | null;
  department: string | null;
  description: string | null;
  status: AssetStatus;
  mobileNumber?: string | null;
  assetImage: string | null;
  documents: AssetDocument[];
  createdAt: string;
}

export interface AssetTypeOption {
  id: string;
  name: string;
  isSystem: boolean;
}

export interface AssetCategoryOption {
  id: string;
  name: string;
  hardwareProfile: 'computer' | 'mobile' | 'none';
  isSystem: boolean;
}

export interface AssetAssignment {
  id: string;
  assetId: string;
  asset?: Asset;
  employeeId: string;
  employee?: Employee;
  assignedAt: string;
  returnedAt: string | null;
  returnedCondition: string | null;
  assignedBy: string | null;
}

export interface Notification {
  id: string;
  employeeId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  employeeId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}