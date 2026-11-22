import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Eye, MapPin, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/ui/StatusBadge';
import './appointments.css';
import {
  appointmentLocationLabels,
  appointmentLocations,
  appointmentService,
  appointmentStatuses,
  type Appointment,
  type AppointmentLocation,
  type AppointmentStatus,
} from '../../services/appointment.service';

function AppointmentBadge({status}:{status:AppointmentStatus}){return <span className="fy-appointments__badge" data-status={status}><StatusBadge status={status}/></span>;}
function EmptyAppointments(){return <div className="fy-appointments__empty"><svg viewBox="0 0 220 130" aria-hidden="true"><path d="M40 107C5 107 9 65 38 62C40 29 71 24 91 39C106 10 151 21 157 50C196 41 220 74 200 98C187 114 63 109 40 107Z" fill="#f1edff"/><rect x="67" y="33" width="87" height="77" rx="10" fill="white" stroke="#7959ce" strokeWidth="2"/><path d="M68 45Q68 34 78 34H144Q154 34 154 45V53H68Z" fill="#7959ce"/><path d="M88 28V42M133 28V42" stroke="#5233a4" strokeWidth="5" strokeLinecap="round"/>{[0,1,2].map(row=>[0,1,2,3].map(col=><rect key={row+'-'+col} x={79+col*18} y={63+row*14} width="12" height="9" rx="2" fill="#e3dcf6"/>))}<circle cx="156" cy="104" r="17" fill="#7959ce"/><path d="M148 104H164M156 96V112" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg><h2>No appointments found</h2><p>There are no appointments for the selected filters.</p></div>;}

const formatDate = (value: string) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [location, setLocation] = useState<AppointmentLocation | ''>('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    appointmentService.list({ page, limit: 10, ...(debouncedSearch ? { search: debouncedSearch } : {}), ...(status ? { status } : {}), ...(location ? { location } : {}), ...(date ? { date } : {}) })
      .then((result) => { if (active) { setAppointments(result.appointments); setTotalPages(Math.max(result.pagination.totalPages, 1)); setError(''); } })
      .catch(() => { if (active) setError('Unable to load appointments. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, debouncedSearch, status, location, date, reload]);

  return (
    <div className="fy-appointments space-y-5">
      <div className="fy-appointments__header"><span className="fy-appointments__hero-icon"><CalendarDays size={25} aria-hidden="true"/></span><div><p className="fy-appointments__eyebrow">Services</p><h1 className="mt-1 text-2xl font-black text-on-surface">Appointments</h1><p className="mt-1 text-sm text-on-surface-variant">Review and manage customer framing appointments.</p></div></div>
      <div className="fy-appointments__filters rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
        <div role="tablist" aria-label="Appointment status" className="fy-appointments__tabs flex gap-2 overflow-x-auto pb-1">{(['', ...appointmentStatuses] as const).map((value) => <button role="tab" aria-selected={status===value} key={value || 'ALL'} onClick={() => { setStatus(value); setPage(1); }} className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-bold ${status === value ? 'border-black bg-black text-white' : 'border-outline-variant bg-white text-on-surface'}`}>{value?value.charAt(0)+value.slice(1).toLowerCase():'All'}</button>)}</div>
        <div className="fy-appointments__filter-row mt-4 grid gap-3 md:grid-cols-[minmax(220px,1fr)_200px_180px]">
          <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-on-surface-variant" /><input aria-label="Search appointments" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-outline-variant bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-black" placeholder="Search name, email or phone" /></label>
          <select aria-label="Filter appointments by location" value={location} onChange={(e) => { setLocation(e.target.value as AppointmentLocation | ''); setPage(1); }} className="rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-sm"><option value="">All locations</option>{appointmentLocations.map((value) => <option value={value} key={value}>{appointmentLocationLabels[value]}</option>)}</select>
          <input aria-label="Filter appointments by date" type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} className="rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-sm" />
        </div>
      </div>
      <div className="fy-appointments__list overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        {error ? <div className="p-10 text-center"><p className="text-sm text-error">{error}</p><button onClick={() => { setLoading(true); setError(''); setReload((value) => value + 1); }} className="mt-3 rounded-lg bg-black px-4 py-2 text-xs font-bold text-white">Retry</button></div> : loading ? <div className="space-y-3 p-4">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-lg bg-black/5" />)}</div> : appointments.length === 0 ? <EmptyAppointments/> : <>
          <div className="hidden overflow-x-auto lg:block"><table className="w-full text-left text-sm"><thead className="bg-surface-container-low text-[11px] uppercase tracking-wide text-on-surface-variant"><tr>{['Customer','Email','Phone','Location','Booking Date','Status','Created At','Actions'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-outline-variant/50">{appointments.map((appointment) => <tr key={appointment.id} className="hover:bg-surface"><td className="px-4 py-4 font-bold"><span className="fy-appointments__customer"><span aria-hidden="true" className="fy-appointments__avatar">{appointment.firstName.trim().charAt(0).toUpperCase()||'?'}</span><span>{appointment.firstName}</span></span></td><td className="px-4 py-4">{appointment.email}</td><td className="px-4 py-4">{appointment.phoneNumber}</td><td className="px-4 py-4">{appointmentLocationLabels[appointment.location]}</td><td className="px-4 py-4">{formatDate(appointment.bookingDate)}</td><td className="px-4 py-4"><AppointmentBadge status={appointment.status}/></td><td className="px-4 py-4">{formatDate(appointment.createdAt)}</td><td className="px-4 py-4"><Link title="View appointment" aria-label="View appointment" to={`/admin/appointments/${appointment.id}`} className="inline-flex rounded-lg border border-outline-variant p-2 hover:bg-black hover:text-white"><Eye className="h-4 w-4" /></Link></td></tr>)}</tbody></table></div>
          <div className="grid gap-3 p-3 lg:hidden">{appointments.map((appointment) => <article key={appointment.id} className="rounded-xl border border-outline-variant p-4"><div className="flex items-start justify-between gap-2"><div className="fy-appointments__mobile-customer"><span className="fy-appointments__avatar" aria-hidden="true">{appointment.firstName.trim().charAt(0).toUpperCase()||'?'}</span><h2 className="font-bold">{appointment.firstName}</h2><p className="text-xs text-on-surface-variant">{appointment.email}</p></div><AppointmentBadge status={appointment.status}/></div><div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><p>{appointment.phoneNumber}</p><p className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{appointmentLocationLabels[appointment.location]}</p><p className="sm:col-span-2">{formatDate(appointment.bookingDate)}</p></div><Link to={`/admin/appointments/${appointment.id}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-black px-3 py-2 text-xs font-bold text-white"><Eye className="h-4 w-4" />View</Link></article>)}</div>
        </>}
        <div className="fy-appointments__footer flex items-center justify-between border-t border-outline-variant p-4 text-xs"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><button aria-label="Previous page" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-outline-variant p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-outline-variant p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
      </div>
    </div>
  );
};

export default AppointmentsPage;
