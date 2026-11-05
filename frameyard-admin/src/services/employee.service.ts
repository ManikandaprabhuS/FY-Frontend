import api from './api';
import { Employee, EmployeePayload, EmployeeQuery, EmployeeUpdatePayload } from '../types/employee.types';
import type { ApiEnvelope, Pagination } from './contracts';

type EmployeeResponse = {
  employees: Employee[];
  pagination: Pagination;
};

type BackendEmployee = Employee & { createdById?: string | null };

const normalizeEmployee = (employee: BackendEmployee): Employee => ({
  ...employee,
  employeeId: employee.employeeId ?? `FY-${employee.id.slice(0, 8).toUpperCase()}`,
  createdBy: employee.createdById ?? employee.createdBy ?? null,
});

export const employeeService = {
  getEmployees: async (params: EmployeeQuery = {}): Promise<EmployeeResponse> => {
    const response = await api.get<ApiEnvelope<{ employees: BackendEmployee[]; pagination: Pagination }>>('/employees', {
      params: {
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
        isActive: params.status === 'active' ? true : params.status === 'inactive' ? false : undefined,
      },
    });
    const employees = response.data.data.employees.map(normalizeEmployee);
    return {
      employees,
      pagination: response.data.data.pagination,
    };
  },

  createEmployee: async (payload: EmployeePayload): Promise<Employee> => {
    const response = await api.post<ApiEnvelope<{ employee: BackendEmployee }>>('/employees', {
      name: payload.name,
      email: payload.email,
      password: payload.password,
      phoneNumber: payload.phoneNumber || undefined,
    });
    return normalizeEmployee(response.data.data.employee);
  },

  updateEmployee: async (id: string, payload: EmployeeUpdatePayload): Promise<Employee> => {
    const response = await api.patch<ApiEnvelope<{ employee: BackendEmployee }>>(`/employees/${id}`, {
      name: payload.name,
      phoneNumber: payload.phoneNumber || null,
    });
    return normalizeEmployee(response.data.data.employee);
  },

  activateEmployee: async (id: string): Promise<Employee> => {
    const response = await api.patch<ApiEnvelope<{ employee: BackendEmployee }>>(`/employees/${id}`, { isActive: true });
    return normalizeEmployee(response.data.data.employee);
  },

  deactivateEmployee: async (id: string): Promise<Employee> => {
    const response = await api.patch<ApiEnvelope<{ employee: BackendEmployee }>>(`/employees/${id}`, { isActive: false });
    return normalizeEmployee(response.data.data.employee);
  },

  deleteEmployee: async (id: string): Promise<void> => {
    await api.delete(`/employees/${id}`);
  },
};
