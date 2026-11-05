import React, { useEffect, useRef, useState } from 'react';
import { Download, Mail, Search, UserCheck, UserX } from 'lucide-react';

import { newsletterService, type NewsletterStatus, type NewsletterSubscriber } from '../../services/newsletter.service';
import { emptyPagination, type Pagination } from '../../services/contracts';
import { showError, showSuccess } from '../../utils/toast';

const PAGE_SIZE = 20;

const dateLabel = (value: string | null) => value
  ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
  : '—';

const NewsletterSubscribersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | NewsletterStatus>('ALL');
  const [page, setPage] = useState(1);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, unsubscribed: 0 });
  const [pagination, setPagination] = useState<Pagination>(emptyPagination(PAGE_SIZE));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    queueMicrotask(() => {
      if (requestId !== requestIdRef.current) return;
      setLoading(true);
      setError('');
    });
    void newsletterService.list({
      page,
      limit: PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(status === 'ALL' ? {} : { status }),
    }).then((result) => {
      if (requestId !== requestIdRef.current) return;
      setSubscribers(result.subscribers);
      setSummary(result.summary);
      setPagination(result.pagination);
    }).catch(() => {
      if (requestId !== requestIdRef.current) return;
      setError('Unable to load newsletter subscribers. Please try again.');
    }).finally(() => {
      if (requestId === requestIdRef.current) setLoading(false);
    });
  }, [debouncedSearch, page, reloadToken, status]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await newsletterService.exportCsv({
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(status === 'ALL' ? {} : { status }),
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'frameyaad-newsletter-subscribers.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('Newsletter subscribers exported successfully.');
    } catch {
      showError('Unable to export subscribers. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-xs font-semibold text-secondary">Customers / Newsletter</p>
        <h1 className="mt-1 text-2xl font-black text-primary sm:text-3xl">Newsletter Subscribers</h1>
        <p className="mt-1 text-sm text-secondary">Manage customers subscribed to FrameYaad newsletter updates.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Newsletter subscriber summary">
        <SummaryCard label="Total Subscribers" value={summary.total} icon={Mail} />
        <SummaryCard label="Active Subscribers" value={summary.active} icon={UserCheck} />
        <SummaryCard label="Unsubscribed" value={summary.unsubscribed} icon={UserX} />
      </section>

      <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search subscriber email</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search email..." className="h-11 w-full rounded-xl border border-outline-variant bg-white pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
          </label>
          <select value={status} onChange={(event) => { setStatus(event.target.value as 'ALL' | NewsletterStatus); setPage(1); }} aria-label="Filter newsletter status" className="h-11 rounded-xl border border-outline-variant bg-white px-4 text-sm font-semibold outline-none focus:border-primary">
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="UNSUBSCRIBED">Unsubscribed</option>
          </select>
          <button type="button" onClick={() => void exportCsv()} disabled={exporting} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-bold text-white transition hover:bg-black/80 disabled:cursor-wait disabled:opacity-55">
            <Download className="h-4 w-4" /> {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        {error ? (
          <div className="p-10 text-center"><p className="text-sm font-semibold text-red-600">{error}</p><button type="button" onClick={() => setReloadToken((value) => value + 1)} className="mt-4 rounded-lg bg-black px-4 py-2 text-xs font-bold text-white">Retry</button></div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-wide text-secondary"><tr><th className="px-5 py-4">Email</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Subscribed Date</th><th className="px-5 py-4">Unsubscribed Date</th></tr></thead>
                <tbody className="divide-y divide-outline-variant/60">
                  {loading ? <SubscriberSkeletonRows /> : subscribers.length === 0 ? <tr><td colSpan={4} className="px-5 py-14 text-center text-secondary">No newsletter subscribers found.</td></tr> : subscribers.map((subscriber) => (
                    <tr key={subscriber.id} className="transition hover:bg-surface-container-low/70"><td className="px-5 py-4 font-semibold text-primary">{subscriber.email}</td><td className="px-5 py-4"><StatusBadge status={subscriber.status} /></td><td className="px-5 py-4 text-secondary">{dateLabel(subscriber.subscribedAt)}</td><td className="px-5 py-4 text-secondary">{dateLabel(subscriber.unsubscribedAt)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 md:hidden">
              {loading ? Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-xl bg-black/5" />) : subscribers.length === 0 ? <p className="py-10 text-center text-sm text-secondary">No newsletter subscribers found.</p> : subscribers.map((subscriber) => (
                <article key={subscriber.id} className="rounded-xl border border-outline-variant p-4"><div className="flex items-start justify-between gap-3"><p className="min-w-0 break-all text-sm font-bold">{subscriber.email}</p><StatusBadge status={subscriber.status} /></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-secondary">Subscribed</dt><dd className="mt-1 font-semibold">{dateLabel(subscriber.subscribedAt)}</dd></div><div><dt className="text-secondary">Unsubscribed</dt><dd className="mt-1 font-semibold">{dateLabel(subscriber.unsubscribedAt)}</dd></div></dl></article>
              ))}
            </div>
          </>
        )}

        {!error && !loading && pagination.total > 0 && (
          <div className="flex flex-col gap-3 border-t border-outline-variant px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span className="text-secondary">Page {pagination.page} of {Math.max(1, pagination.totalPages)} · {pagination.total} results</span>
            <div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-outline-variant px-4 py-2 font-semibold disabled:opacity-35">Previous</button><button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-outline-variant px-4 py-2 font-semibold disabled:opacity-35">Next</button></div>
          </div>
        )}
      </section>
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: number; icon: React.ComponentType<{ className?: string }> }> = ({ label, value, icon: Icon }) => (
  <article className="rounded-2xl border border-outline-variant bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-secondary">{label}</p><p className="mt-3 text-3xl font-black text-primary">{value.toLocaleString('en-IN')}</p></div><span className="grid h-10 w-10 place-items-center rounded-xl border border-outline-variant bg-white"><Icon className="h-5 w-5" /></span></div></article>
);

const StatusBadge: React.FC<{ status: NewsletterStatus }> = ({ status }) => (
  <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-black ${status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-black/8 text-black/55'}`}>{status}</span>
);

const SubscriberSkeletonRows = () => <>{Array.from({ length: 6 }, (_, row) => <tr key={row}>{Array.from({ length: 4 }, (_, column) => <td key={column} className="px-5 py-5"><div className="h-4 animate-pulse rounded bg-black/8" /></td>)}</tr>)}</>;

export default NewsletterSubscribersPage;
