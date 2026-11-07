import { useRef, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, LoaderCircle, Upload } from 'lucide-react';
import { uploadProductImages } from '../../services/product.service';
import { showSuccess, showWarning, showApiError } from '../../utils/toast';

interface OptionalImageUploadProps {
  label: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
}

export default function OptionalImageUpload({ label, value, onChange, busy, onBusyChange }: OptionalImageUploadProps) {
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return <div className={`min-w-0 rounded-lg border p-3 transition-colors ${value ? 'border-emerald-300 bg-emerald-50/50' : 'border-outline-variant bg-white'}`}>
    <button type="button" disabled={busy} onClick={() => input.current?.click()} aria-label={`${value ? 'Replace' : 'Upload'} ${label}`} className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-md px-2 py-3 text-center transition-colors hover:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60">
      {uploading ? <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin text-black" /> : <Upload aria-hidden="true" className={`h-6 w-6 ${value ? 'text-emerald-700' : 'text-black'}`} />}
      <span className="break-words text-xs font-semibold text-on-surface">{label}</span>
      <span className={`flex items-center gap-1 text-[11px] ${value ? 'text-emerald-700' : 'text-on-surface-variant'}`}>
        {value && <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />}
        {uploading ? 'Uploading…' : value ? 'Uploaded · Click to replace' : 'Upload image (optional)'}
      </span>
    </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} aria-label={label} className="hidden" onChange={async event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!file || busy) return;
        setError('');
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
          setError('Choose a JPG, PNG or WebP image up to 10 MB.');
          showWarning('Choose a JPG, PNG or WebP image up to 10 MB.');
          return;
        }
        onBusyChange(true);
        setUploading(true);
        try {
          const urls = await uploadProductImages([file]) as string[];
          if (!urls[0]) throw new Error('The upload did not return an image.');
          onChange(urls[0]);
          showSuccess(`${label} uploaded`);
        } catch (failure) {
          showApiError(failure, axios.isAxiosError<{ error?: { message?: string } }>(failure) ? failure.response?.data?.error?.message ?? 'Image upload failed. Please try again.' : 'Image upload failed. Please try again.');
          setError(axios.isAxiosError<{ error?: { message?: string } }>(failure)
            ? failure.response?.data?.error?.message ?? 'Image upload failed. Please try again.'
            : 'Image upload failed. Please try again.');
        } finally { setUploading(false); onBusyChange(false); }
      }} />
    {value && <button type="button" disabled={busy} onClick={() => { onChange(null); setError(''); }} className="min-h-11 w-full rounded text-xs text-on-surface-variant underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50">Remove image</button>}
    <span role="status" className="sr-only">{uploading ? 'Uploading image' : value ? `${label} uploaded` : ''}</span>
    {error && <p role="alert" className="text-xs text-error">{error}</p>}
  </div>;
}
