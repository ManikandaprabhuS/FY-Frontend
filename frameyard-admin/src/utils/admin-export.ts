import api from '../services/api';
import { showError, showLoading, showSuccess, showWarning } from './toast';

const activeExports = new Set<string>();
export async function downloadAdminCsv(kind: 'products' | 'customers', params: Record<string, string | boolean | undefined>) {
  if (activeExports.has(kind)) return;
  activeExports.add(kind);
  const toastId = kind + '-export';
  showLoading('Please wait, your export is being generated...', toastId);
  try {
    const response = await api.get<Blob>(kind === 'customers' ? '/users/export' : '/products/export', { params, responseType: 'blob', timeout: 120_000 });
    if (response.status === 204 || !response.data.size) { showWarning('No records match the selected filters', { id: toastId }); return; }
    const url = URL.createObjectURL(response.data);
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = kind + '-export-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(link); link.click(); link.remove();
    } finally { window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
    showSuccess('Export downloaded successfully', { id: toastId });
  } catch {
    showError('Unable to generate export. Please try again.', { id: toastId, retry: () => { void downloadAdminCsv(kind, params); } });
  } finally { activeExports.delete(kind); }
}
