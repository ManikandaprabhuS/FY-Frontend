import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, UserRound, X } from 'lucide-react';
import { adminSearch, adminSearchPath, type AdminSearchResults, type SearchChoice } from '../../services/admin-search.service';
import { showApiError, showWarning } from '../../utils/toast';
export default function GlobalAdminSearch({ autoFocus = false, onNavigate }: { autoFocus?: boolean; onNavigate?: () => void }) {
  const navigate = useNavigate(); const id = useId(); const root = useRef<HTMLDivElement>(null); const input = useRef<HTMLInputElement>(null); const submitLock = useRef(false);
  const [query, setQuery] = useState(''); const [open, setOpen] = useState(false); const [loading, setLoading] = useState(false); const [active, setActive] = useState(-1);
  const [result, setResult] = useState<{ query: string; data: AdminSearchResults } | null>(null); const [failed, setFailed] = useState(false);
  const current = result?.query === query.trim() ? result.data : null;
  const choices: SearchChoice[] = current ? [...current.orders.map(value => ({ kind: 'order' as const, value })), ...current.customers.map(value => ({ kind: 'customer' as const, value }))] : [];
  useEffect(() => {
    if (!query.trim()) return;
    let valid = true; const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true); setFailed(false);
      void adminSearch(query, controller.signal).then(data => { if (valid) setResult({ query: query.trim(), data }); }).catch(() => { if (valid) setFailed(true); }).finally(() => { if (valid) setLoading(false); });
    }, 300);
    return () => { valid = false; controller.abort(); window.clearTimeout(timer); };
  }, [query]);
  useEffect(() => { const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener('pointerdown', close); return () => document.removeEventListener('pointerdown', close); }, []);
  const go = (data: AdminSearchResults, choice?: SearchChoice) => {
    const path = adminSearchPath(data, choice);
    if (!path) { if (!data.counts.orders && !data.counts.customers) showWarning(`No orders or customers found for '${query.trim()}'`, { id: 'global-search-empty:' + query.trim().toLowerCase() }); return; }
    setOpen(false); navigate(path); onNavigate?.();
  };
  const submit = async () => {
    const value = query.trim(); if (!value || submitLock.current) return;
    submitLock.current = true;
    try {
      const data = current ?? await adminSearch(value);
      if (input.current?.value.trim() !== value) return;
      const explicit = active >= 0 ? choices[active] : data.kind === 'text' && data.counts.orders && data.counts.customers && data.orders[0] ? { kind: 'order' as const, value: data.orders[0]! } : undefined;
      go(data, explicit);
    } catch (error) { showApiError(error, 'Search is temporarily unavailable. Please try again.'); }
    finally { submitLock.current = false; }
  };
  return <div ref={root} className="relative min-w-0 w-full">
    <div className="flex w-full items-center rounded-full border border-outline-variant bg-surface px-3 py-1.5 focus-within:border-primary focus-within:bg-surface-container-lowest">
      <Search className="mr-2 h-4 w-4 shrink-0 text-outline-variant" />
      <input ref={input} autoFocus={autoFocus} role="combobox" aria-label="Search orders and customers" aria-expanded={open && Boolean(query.trim())} aria-controls={id} aria-autocomplete="list" aria-activedescendant={open && choices[active] ? id + '-' + active : undefined} maxLength={120} className="min-w-0 w-full border-none bg-transparent p-0 text-xs text-on-surface outline-none" placeholder="Search orders, customers..." value={query} onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setActive(-1); setOpen(true); }} onKeyDown={event => {
        if (event.key === 'Escape') setOpen(false);
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive(index => choices.length ? index < 0 ? event.key === 'ArrowDown' ? 0 : choices.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length : -1); }
        if (event.key === 'Enter') { event.preventDefault(); void submit(); }
      }} />
      {query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); setOpen(false); setActive(-1); }} className="ml-2 rounded-full p-0.5"><X className="h-3.5 w-3.5" /></button>}
    </div>
    {open && query.trim() && <div id={id} role="listbox" aria-label="Search results" className="absolute right-0 top-full z-[60] mt-2 max-h-[65svh] w-full overflow-y-auto rounded-xl border border-gray-200 bg-white text-gray-900 shadow-xl lg:w-96 lg:max-w-[calc(100vw-2rem)]">
      {loading || !current && !failed ? <p role="status" className="p-4 text-xs">Searching...</p> : failed ? <p className="p-4 text-xs">Search unavailable. Press Enter to retry.</p> : !choices.length ? <p className="p-4 text-xs">No orders or customers found.</p> : (['order', 'customer'] as const).map(kind => <div key={kind} role="group" aria-label={kind === 'order' ? 'Orders' : 'Customers'}>
        {choices.some(choice => choice.kind === kind) && <p className="bg-gray-50 px-3 py-2 text-[10px] font-bold uppercase">{kind === 'order' ? 'Orders' : 'Customers'}</p>}
        {choices.map((choice, index) => choice.kind !== kind ? null : <button key={choice.kind + choice.value.id} id={id + '-' + index} type="button" role="option" aria-selected={active === index} onClick={() => current && go(current, choice)} className={`flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-gray-100 focus-visible:bg-gray-100 ${active === index ? 'bg-gray-100' : ''}`}>
          {choice.kind === 'order' ? <ShoppingCart className="mt-0.5 h-4 w-4 shrink-0" /> : <UserRound className="mt-0.5 h-4 w-4 shrink-0" />}
          <span className="min-w-0"><strong className="block truncate text-xs">{choice.kind === 'order' ? choice.value.orderNumber : choice.value.name}</strong><span className="block truncate text-[11px] text-gray-600">{choice.kind === 'order' ? choice.value.user.name + ' · ' + choice.value.status.replaceAll('_', ' ') : [choice.value.phoneNumber, choice.value.email].filter(Boolean).join(' · ')}</span></span>
        </button>)}
      </div>)}
    </div>}
  </div>;
}
