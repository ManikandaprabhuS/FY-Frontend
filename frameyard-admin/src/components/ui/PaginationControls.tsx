import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Pagination } from '../../services/contracts';

export default function PaginationControls({ pagination, busy = false, onPageChange }: { pagination: Pagination; busy?: boolean; onPageChange: (page: number) => void }) {
  if (pagination.total === 0) return null;
  return <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-variant">
    <span>Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</span>
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Previous page" disabled={busy || pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)} className="grid h-10 w-10 place-items-center rounded-lg border border-outline-variant disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
      <span>Page {pagination.page} of {Math.max(1, pagination.totalPages)}</span>
      <button type="button" aria-label="Next page" disabled={busy || pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)} className="grid h-10 w-10 place-items-center rounded-lg border border-outline-variant disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
    </div>
  </nav>;
}
