import { useEffect, useState } from 'react';
import AppointmentDetailsView from './AppointmentDetailsView';

import { Link, useParams } from 'react-router-dom';

import { showError, showSuccess, showWarning } from '../../utils/toast';
import { appointmentService, type Appointment } from '../../services/appointment.service';



const AppointmentDetailsPage = () => {
  const { id = '' } = useParams();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'CONFIRM' | 'RESCHEDULE' | 'CANCEL' | 'COMPLETE' | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { let active = true; appointmentService.getById(id).then((value) => { if (active) setAppointment(value); }).catch(() => showError('Unable to load appointment.')).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [id]);

  const save = async () => {
    if (!appointment || !action || saving) return;
    if (action === 'RESCHEDULE' && (!bookingDate || new Date(bookingDate).getTime() <= Date.now() || new Date(bookingDate).getTime() === new Date(appointment.bookingDate).getTime())) { showWarning('Select a different future booking date.'); return; }
    setSaving(true);
    try {
      const updated = await appointmentService.updateStatus(appointment.id, action === 'CONFIRM' ? { status: 'CONFIRMED' } : action === 'COMPLETE' ? { status: 'COMPLETED' } : action === 'CANCEL' ? { status: 'CANCELLED', ...(reason.trim() ? { cancellationReason: reason.trim() } : {}) } : { status: 'RESCHEDULED', bookingDate: new Date(bookingDate).toISOString(), ...(reason.trim() ? { rescheduleReason: reason.trim() } : {}) });
      setAppointment(updated); setAction(null); setReason(''); setBookingDate(''); showSuccess(`Appointment marked as ${updated.status.toLowerCase()}.`);
    } catch (error) { const value = error as { response?: { data?: { error?: { message?: string } } } }; showError(value.response?.data?.error?.message || 'Unable to update appointment.'); } finally { setSaving(false); }
  };

  if (loading) return <div className="apt-detail-skeleton animate-pulse" role="status" aria-label="Loading appointment details"><div /><section><article /><article /><article /></section><div /><div /></div>;
  if (!appointment) return <div className="rounded-xl border border-outline-variant bg-white p-10 text-center">Appointment not found.<br /><Link to="/admin/appointments" className="apt-back">Back to Appointments</Link></div>;
  const actions = appointment.status === 'PENDING' ? ['CONFIRM','RESCHEDULE','CANCEL'] as const : appointment.status === 'CONFIRMED' ? ['RESCHEDULE','CANCEL','COMPLETE'] as const : appointment.status === 'RESCHEDULED' ? ['CONFIRM','RESCHEDULE','CANCEL','COMPLETE'] as const : [];

  return <AppointmentDetailsView appointment={appointment} actions={actions} action={action} setAction={setAction} bookingDate={bookingDate} setBookingDate={setBookingDate} reason={reason} setReason={setReason} saving={saving} save={save} />;
};

export default AppointmentDetailsPage;
