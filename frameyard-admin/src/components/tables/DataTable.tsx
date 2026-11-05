import React from 'react';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';

interface TableHeader {
  key: string;
  label: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  headers: TableHeader[];
  items: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  renderCard: (item: T, index: number) => React.ReactNode;
  loading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyActionText?: string;
  onEmptyAction?: () => void;
}

export function DataTable<T>({
  headers,
  items,
  renderRow,
  renderCard,
  loading = false,
  emptyTitle = 'No data available',
  emptyMessage = 'There are no records matching your criteria.',
  emptyActionText,
  onEmptyAction,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="w-full" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading table data</span>
        <div className="hidden overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  {headers.map((header) => <th key={header.key} className="px-6 py-4"><Skeleton className="h-3 w-20" /></th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {Array.from({ length: 5 }).map((_, row) => (
                  <tr key={row} className="h-[76px]">
                    {headers.map((header, col) => (
                      <td key={header.key} className="px-6 py-4">
                        <Skeleton className={`${col === 0 ? 'h-10 w-10 rounded-lg' : col === 1 ? 'h-4 w-40' : 'h-4 w-24'} shadow-sm`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex flex-col gap-3 md:hidden">
          {Array.from({ length: 5 }).map((_, row) => (
            <div key={row} className="flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
              <Skeleton className="h-14 w-14 rounded-lg" />
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        message={emptyMessage}
        actionText={emptyActionText}
        onAction={onEmptyAction}
      />
    );
  }

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  return (
    <div className="w-full">
      {/* ------------------------------------------------------------- */}
      {/* DESKTOP TABLE VIEW */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
              <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low font-semibold text-xs uppercase tracking-wide text-secondary">
                {headers.map((header) => (
                  <th
                    key={header.key}
                    className={`px-6 py-4 font-semibold ${getAlignClass(
                      header.align
                    )} ${header.className || ''}`}
                  >
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 text-sm text-on-surface [&>tr]:transition-colors [&>tr:hover]:bg-surface-container-low/60">
              {items.map((item, index) => renderRow(item, index))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE CARD VIEW */}
      {/* ------------------------------------------------------------- */}
      <div className="md:hidden flex flex-col gap-4">
        {items.map((item, index) => renderCard(item, index))}
      </div>
    </div>
  );
}

export default React.memo(DataTable) as typeof DataTable;

