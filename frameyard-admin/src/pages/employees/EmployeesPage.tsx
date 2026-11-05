import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit2, Trash2, UserCheck, UserX } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import useAuth from '../../hooks/useAuth';
import { employeeService } from '../../services/employee.service';
import { Employee } from '../../types/employee.types';
import { showError, showSuccess } from '../../utils/toast';

type FormState = {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
};

const emptyForm: FormState = {
  name: '',
  email: '',
  phoneNumber: '',
  password: '',
};

const generatePassword = () => `FYemp@${Math.random().toString(36).slice(2, 8)}1`;

const EmployeesPage: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const isAdmin = user?.role === 'ADMIN';

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await employeeService.getEmployees({
        page: currentPage,
        limit: 10,
        search: searchTerm.trim(),
        status: statusFilter,
      });
      setEmployees(response.employees);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchTerm.trim() && currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
      void fetchEmployees();
    }, searchTerm.trim() ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [currentPage, statusFilter, isAdmin, searchTerm]);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setForm({ ...emptyForm, password: generatePassword() });
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setForm({
      name: employee.name,
      email: employee.email,
      phoneNumber: employee.phoneNumber || '',
      password: '',
    });
    setError(null);
    setModalOpen(true);
  };

  const validateForm = () => {
    if (!form.name.trim()) return 'Employee name is required';
    if (!form.email.trim()) return 'Email address is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address';
    if (!editingEmployee && form.password.length < 8) return 'Temporary password must be at least 8 characters';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editingEmployee) {
        await employeeService.updateEmployee(editingEmployee.id, {
          name: form.name,
          phoneNumber: form.phoneNumber,
        });
      } else {
        await employeeService.createEmployee(form);
      }
      setModalOpen(false);
      await fetchEmployees();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (employee: Employee) => {
    const confirmed = window.confirm(employee.isActive ? 'Deactivate this employee?' : 'Activate this employee?');
    if (!confirmed) return;
    setError(null);

    try {
      const updatedEmployee = employee.isActive
        ? await employeeService.deactivateEmployee(employee.id)
        : await employeeService.activateEmployee(employee.id);

      setEmployees((currentEmployees) =>
        currentEmployees.map((currentEmployee) =>
          currentEmployee.id === employee.id ? updatedEmployee : currentEmployee
        )
      );
      showSuccess(updatedEmployee.isActive ? 'Employee activated successfully' : 'Employee deactivated successfully');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to update employee status';
      setError(message);
      showError(message);
    }
  };

  const handleDelete = async (employee: Employee) => {
    const confirmed = window.confirm(`Delete ${employee.name}? This cannot be undone.`);
    if (!confirmed) return;
    setError(null);
    try {
      await employeeService.deleteEmployee(employee.id);
      setEmployees((currentEmployees) => currentEmployees.filter((item) => item.id !== employee.id));
      showSuccess('Employee deleted successfully');
      await fetchEmployees();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete employee';
      setError(message);
      showError(message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-outline-variant/60 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Employee Management</h2>
          <p className="mt-1 text-sm text-secondary">Create, update, activate, and manage dashboard employees.</p>
        </div>
        {isAdmin && (
          <button onClick={openCreateModal} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary/95">
            <Plus className="h-4 w-4" />
            Create Employee
          </button>
        )}
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <div className="flex items-center rounded-lg border border-outline-variant bg-surface px-3 py-2">
            <Search className="mr-2 h-4 w-4 text-outline-variant" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search name, email, phone, or ID..." />
          </div>
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1); }} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-center text-sm outline-none [text-align-last:center]">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {error && <div className="rounded-xl border border-error/30 bg-error-container p-3 text-sm font-medium text-on-error-container">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead className="border-b border-outline-variant bg-surface text-xs font-semibold uppercase tracking-wider text-secondary">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/35 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-secondary">Loading employees...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-secondary">No employees found.</td></tr>
              ) : employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-surface/40">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-on-surface">{employee.name}</div>
                    <div className="mt-0.5 text-xs text-secondary">{employee.email}</div>
                    <div className="mt-0.5 text-[10px] text-secondary">{employee.employeeId}</div>
                  </td>
                  <td className="px-6 py-4">{employee.phoneNumber || 'Not provided'}</td>
                  <td className="px-6 py-4 text-secondary">{new Date(employee.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-6 py-4"><Badge type={employee.isActive ? 'success' : 'neutral'}>{employee.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="px-6 py-4 text-secondary">{new Date(employee.updatedAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => openEditModal(employee)} className="rounded-lg p-2 hover:bg-surface" title="Edit"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => handleStatusToggle(employee)} className="rounded-lg p-2 hover:bg-surface" title={employee.isActive ? 'Deactivate' : 'Activate'}>{employee.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}</button>
                      <button onClick={() => handleDelete(employee)} className="rounded-lg p-2 text-error hover:bg-error/10" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 p-4 md:hidden">
          {loading ? <div className="py-8 text-center text-sm text-secondary">Loading employees...</div> : employees.length === 0 ? <div className="py-8 text-center text-sm text-secondary">No employees found.</div> : employees.map((employee) => (
            <div key={employee.id} className="rounded-xl border border-outline-variant bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-on-surface">{employee.name}</div>
                  <div className="mt-0.5 text-xs text-secondary">{employee.email}</div>
                  <div className="mt-0.5 text-[10px] text-secondary">{employee.employeeId}</div>
                </div>
                <Badge type={employee.isActive ? 'success' : 'neutral'}>{employee.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><span className="block text-secondary">Phone</span><span className="font-semibold">{employee.phoneNumber || 'Not provided'}</span></div>
                <div><span className="block text-secondary">Created</span><span className="font-semibold">{new Date(employee.createdAt).toLocaleDateString('en-IN')}</span></div>
              </div>
              <div className="mt-3 flex justify-end gap-1.5 border-t border-outline-variant pt-3">
                <button onClick={() => openEditModal(employee)} className="rounded-lg p-2 hover:bg-surface-container"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => handleStatusToggle(employee)} className="rounded-lg p-2 hover:bg-surface-container">{employee.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}</button>
                <button onClick={() => handleDelete(employee)} className="rounded-lg p-2 text-error hover:bg-error/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="rounded-lg border border-outline-variant px-4 py-2 text-sm disabled:opacity-40">Previous</button>
        <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
        <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="rounded-lg border border-outline-variant px-4 py-2 text-sm disabled:opacity-40">Next</button>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingEmployee ? 'Update Employee' : 'Create Employee'} footer={<><button onClick={() => setModalOpen(false)} className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold">Cancel</button><button onClick={handleSubmit} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60">{saving ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Create Employee'}</button></>}>
        <div className="grid gap-4">
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="rounded-xl border border-outline-variant p-3 text-sm outline-none" placeholder="Employee Name" />
          <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} disabled={!!editingEmployee} className="rounded-xl border border-outline-variant p-3 text-sm outline-none disabled:bg-surface-container" placeholder="Email Address" />
          <input value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} className="rounded-xl border border-outline-variant p-3 text-sm outline-none" placeholder="Phone Number (optional)" />
          {!editingEmployee && <div className="flex gap-2"><input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="min-w-0 flex-1 rounded-xl border border-outline-variant p-3 text-sm outline-none" placeholder="Temporary Password" /><button onClick={() => setForm({ ...form, password: generatePassword() })} className="rounded-xl border border-outline-variant px-3 text-xs font-semibold">Generate</button></div>}
        </div>
      </Modal>

    </div>
  );
};

export default EmployeesPage;
