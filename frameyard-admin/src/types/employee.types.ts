export interface Employee {
  id: string;
  employeeId?: string | null;
  name: string;
  email: string;
  phoneNumber?: string | null;
  designation?: string | null;
  department?: string | null;
  role: 'EMPLOYEE';
  isActive: boolean;
  createdBy?: string | null;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EmployeePayload = {
  name: string;
  email: string;
  phoneNumber?: string;
  password: string;
};

export type EmployeeUpdatePayload = {
  name: string;
  phoneNumber?: string;
};

export type EmployeeQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
};
