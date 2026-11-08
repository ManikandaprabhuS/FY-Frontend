import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from './Modal';
import { getApiErrorMessage } from '../../services/api';
import FormAction from './FormAction';
import { resolveColorOption, useFrameColors } from '../../store/frameColorStore';
import { showLoading, showSuccess, showApiError, dismissToast } from '../../utils/toast';

export default function ProductColorPicker({ selected, onChange, busy, onBusyChange }: { selected: string[]; onChange: (colors: string[]) => void; busy: boolean; onBusyChange: (busy: boolean) => void }) {
  const { colors, legacyColors, add } = useFrameColors();
  const savingLock = useRef(false);
  const [open, setOpen] = useState(false); const [name, setName] = useState(''); const [hex, setHex] = useState('#000000'); const [saving, setSaving] = useState(false);
  const options = colors.map(color => ({ ...color, value: color.hex }));
  const matches = (value: string, color: { value: string; hex: string }) => value.toLowerCase() === color.value.toLowerCase() || Boolean(color.hex && resolveColorOption(value, colors, legacyColors).hex.toLowerCase() === color.hex.toLowerCase());
  for (const value of selected) {
    const color = resolveColorOption(value, colors, legacyColors);
    if (!options.some(option => matches(value, option))) options.push({ ...color, value });
  }
  const issue = !/^[A-Za-z0-9 ]{2,30}$/.test(name.trim()) ? 'Colour name must contain 2–30 letters, numbers or spaces.' : !/^#[a-f0-9]{6}$/i.test(hex) ? 'Enter a valid six-digit hex colour.' : [...colors, ...legacyColors].some(color => color.name.toLowerCase() === name.trim().toLowerCase() || color.hex.toLowerCase() === hex.toLowerCase()) ? 'A colour with this name or hex already exists.' : null;
  const save = async () => {
    if (savingLock.current || issue) return;
    savingLock.current = true;
    setSaving(true); onBusyChange(true);
    const id = 'add-frame-colour'; let finished = false;
    showLoading('Please wait, your colour is being added...', id);
    try { const color = await add(name, hex); onChange([...selected, color.hex]); setOpen(false); showSuccess('Colour added successfully', { id }); finished = true; }
    catch (error) { showApiError(error, getApiErrorMessage(error, 'Unable to add colour. Please try again.'), { id }); finished = true; }
    finally { if (!finished) dismissToast(id); savingLock.current = false; setSaving(false); onBusyChange(false); }
  };
  return <>
    <div className="flex flex-wrap items-start gap-3">
      {options.map(color => {
        const active = selected.some(value => matches(value, color));
        return <button key={color.value} type="button" disabled={busy || saving} title={color.name} aria-label={color.name} aria-pressed={active} onClick={() => onChange(active ? selected.filter(value => !matches(value, color)) : [...selected, color.value])} className="flex w-20 flex-col items-center gap-1.5 rounded-md p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50">
          <span className={`h-9 w-9 rounded-full border-2 ${active ? 'border-primary ring-2 ring-primary/30 ring-offset-2' : 'border-outline-variant'}`} style={{ backgroundColor: color.hex || '#d1d5db' }} />
          <span className="w-full break-words text-center text-[10px] font-bold">{color.name}</span>
        </button>;
      })}
      <button type="button" disabled={busy || saving} onClick={() => { setName(''); setHex('#000000'); setOpen(true); }} className="flex w-20 flex-col items-center gap-1.5 p-1 text-[10px] font-bold disabled:opacity-50" aria-label="Add colour"><span className="grid h-9 w-9 place-items-center rounded-full border border-dashed border-outline-variant"><Plus className="h-4 w-4" /></span>+ Add colour</button>
    </div>
    <Modal isOpen={open} onClose={() => { if (!saving) setOpen(false); }} title="Add colour" size="sm" footer={<FormAction onClick={save} issue={issue} busy={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary">Add colour</FormAction>}>
      <div className="space-y-4"><label className="block text-xs font-bold">Colour name<input value={name} onChange={event => setName(event.target.value)} maxLength={30} className="mt-2 w-full rounded-lg border p-3 font-normal" placeholder="e.g. Forest Green" /></label><label className="block text-xs font-bold">Hex colour<div className="mt-2 flex gap-3"><input type="color" value={/^#[a-f0-9]{6}$/i.test(hex) ? hex : '#000000'} onChange={event => setHex(event.target.value.toUpperCase())} className="h-11 w-14" aria-label="Colour picker" /><input value={hex} onChange={event => setHex(event.target.value.toUpperCase())} maxLength={7} className="min-w-0 flex-1 rounded-lg border p-3 font-normal" placeholder="#A1B2C3" /></div></label></div>
    </Modal>
  </>;
}
