import React, { useState } from 'react';
import { CalendarDays, CheckCircle2, MapPin } from 'lucide-react';
import {
  appointmentFrameTypeLabels,
  appointmentFrameTypes,
  appointmentLocationLabels,
  appointmentLocations,
  appointmentService,
  type Appointment,
  type AppointmentFrameType,
  type AppointmentLocation,
} from '../../../services/appointment.service';

interface FormState {
  firstName: string;
  email: string;
  phoneNumber: string;
  bookingDate: string;
  location: AppointmentLocation | '';
  frameTypes: AppointmentFrameType[];
  otherFrameType: string;
}

const initialForm: FormState = {
  firstName: '', email: '', phoneNumber: '', bookingDate: '', location: '', frameTypes: [], otherFrameType: '',
};

const inputClass = 'w-full rounded-lg border border-black/20 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10';

const errorMessage = (error: unknown) => {
  const apiError = error as { response?: { data?: { error?: { message?: string }; message?: string } } };
  return apiError.response?.data?.error?.message || apiError.response?.data?.message || 'Unable to submit your appointment right now. Please try again.';
};

const BookAppointmentPage: React.FC = () => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Appointment | null>(null);

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const toggleFrameType = (type: AppointmentFrameType) => {
    const selected = form.frameTypes.includes(type);
    const next = selected ? form.frameTypes.filter((value) => value !== type) : [...form.frameTypes, type];
    setForm((current) => ({ ...current, frameTypes: next, ...(type === 'OTHERS' && selected ? { otherFrameType: '' } : {}) }));
    setErrors((current) => ({ ...current, frameTypes: '', otherFrameType: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.firstName.trim().length < 2) next.firstName = 'First name must contain at least 2 characters.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Please enter a valid email address.';
    if (!/^(?:\+91|91)?[6-9]\d{9}$/.test(form.phoneNumber.replace(/[\s()-]/g, ''))) next.phoneNumber = 'Please enter a valid Indian phone number.';
    if (!form.bookingDate || new Date(form.bookingDate).getTime() <= Date.now()) next.bookingDate = 'Please select a future booking date and time.';
    if (!form.location) next.location = 'Please choose a location.';
    if (form.frameTypes.length === 0) next.frameTypes = 'Select at least one frame requirement.';
    if (form.frameTypes.includes('OTHERS') && form.otherFrameType.trim().length < 2) next.otherFrameType = 'Please describe your other frame requirement.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || !validate()) return;
    setSubmitting(true);
    setErrors({});
    try {
      const appointment = await appointmentService.create({
        firstName: form.firstName.trim(),
        email: form.email.trim().toLowerCase(),
        phoneNumber: form.phoneNumber.trim(),
        bookingDate: new Date(form.bookingDate).toISOString(),
        location: form.location as AppointmentLocation,
        frameTypes: form.frameTypes,
        ...(form.frameTypes.includes('OTHERS') ? { otherFrameType: form.otherFrameType.trim() } : {}),
      });
      setCreated(appointment);
    } catch (error) {
      setErrors({ submit: errorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <section className="mx-auto flex min-h-[65vh] max-w-2xl items-center px-4 py-12 sm:px-6">
        <div className="w-full rounded-2xl border border-black/10 bg-white p-6 text-center shadow-[0_18px_55px_rgba(0,0,0,0.08)] sm:p-10">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
          <h1 className="mt-4 text-2xl font-black sm:text-3xl">Your appointment request has been received</h1>
          <p className="mt-2 text-sm text-black/60">Our team will review your request and contact you shortly.</p>
          <dl className="mt-7 grid gap-3 rounded-xl bg-black/[0.03] p-5 text-left text-sm sm:grid-cols-2">
            <div><dt className="text-black/50">Booking date</dt><dd className="font-bold">{new Date(created.bookingDate).toLocaleString()}</dd></div>
            <div><dt className="text-black/50">Location</dt><dd className="font-bold">{appointmentLocationLabels[created.location]}</dd></div>
            <div className="sm:col-span-2"><dt className="text-black/50">Requirements</dt><dd className="font-bold">{created.frameTypes.map((type) => appointmentFrameTypeLabels[type]).join(', ')}</dd></div>
          </dl>
          <p className="mt-5 text-xs text-black/55">
            {created.emailStatus === 'SENT' ? 'A confirmation email has been sent to you.' : 'Your request is saved. Our team will contact you even though the confirmation email could not be delivered.'}
          </p>
          <button type="button" onClick={() => { setCreated(null); setForm(initialForm); }} className="mt-6 rounded-lg bg-black px-6 py-3 text-sm font-bold text-white">Book another appointment</button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#f6f6f6] px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
      <form onSubmit={submit} className="mx-auto max-w-3xl rounded-2xl border border-black/10 bg-white p-5 shadow-[0_18px_55px_rgba(0,0,0,0.07)] sm:p-8 lg:p-10" noValidate>
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-black/45">FrameYaad Service</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">Book an Appointment</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-black/55">Tell us what you would like to frame and choose the nearest FrameYaad location.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">First Name<input className={`${inputClass} mt-2`} value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} placeholder="First name" maxLength={50} />{errors.firstName && <span className="mt-1 block text-xs text-red-600">{errors.firstName}</span>}</label>
          <label className="text-sm font-bold">Email<input className={`${inputClass} mt-2`} value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="Email address" type="email" />{errors.email && <span className="mt-1 block text-xs text-red-600">{errors.email}</span>}</label>
          <label className="text-sm font-bold">Phone Number<input className={`${inputClass} mt-2`} value={form.phoneNumber} onChange={(e) => setField('phoneNumber', e.target.value)} placeholder="+91 98765 43210" inputMode="tel" />{errors.phoneNumber && <span className="mt-1 block text-xs text-red-600">{errors.phoneNumber}</span>}</label>
          <label className="text-sm font-bold">Booking Date &amp; Time<div className="relative mt-2"><CalendarDays className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-black/45" /><input className={`${inputClass} pl-10`} value={form.bookingDate} onChange={(e) => setField('bookingDate', e.target.value)} type="datetime-local" /></div>{errors.bookingDate && <span className="mt-1 block text-xs text-red-600">{errors.bookingDate}</span>}</label>
        </div>
        <fieldset className="mt-7"><legend className="text-sm font-black">Location</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{appointmentLocations.map((location) => <label key={location} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-semibold transition ${form.location === location ? 'border-black bg-black text-white' : 'border-black/15 hover:border-black/40'}`}><input type="radio" className="accent-black" checked={form.location === location} onChange={() => setField('location', location)} /><MapPin className="h-4 w-4" />{appointmentLocationLabels[location]}</label>)}</div>{errors.location && <span className="mt-1 block text-xs text-red-600">{errors.location}</span>}</fieldset>
        <fieldset className="mt-7"><legend className="text-sm font-black">What do you want to frame?</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{appointmentFrameTypes.map((type) => <label key={type} className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/10 px-4 py-3 text-sm hover:border-black/35"><input type="checkbox" className="h-4 w-4 accent-black" checked={form.frameTypes.includes(type)} onChange={() => toggleFrameType(type)} />{appointmentFrameTypeLabels[type]}</label>)}</div>{errors.frameTypes && <span className="mt-1 block text-xs text-red-600">{errors.frameTypes}</span>}</fieldset>
        {form.frameTypes.includes('OTHERS') && <label className="mt-5 block text-sm font-bold">Other Frame Requirement<textarea className={`${inputClass} mt-2 min-h-24 resize-y`} value={form.otherFrameType} onChange={(e) => setField('otherFrameType', e.target.value)} maxLength={250} placeholder="Describe what you would like us to frame" />{errors.otherFrameType && <span className="mt-1 block text-xs text-red-600">{errors.otherFrameType}</span>}</label>}
        {errors.submit && <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errors.submit}</div>}
        <button disabled={submitting} type="submit" className="mt-7 w-full rounded-lg bg-black px-5 py-3.5 text-sm font-bold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:bg-black/45">{submitting ? 'Submitting...' : 'Submit Appointment Request'}</button>
      </form>
    </section>
  );
};

export default BookAppointmentPage;
