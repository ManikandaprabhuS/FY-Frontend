import { useEffect } from 'react';
import { create } from 'zustand';
import api from '../services/api';
export interface FrameColor { id?: string; name: string; hex: string }
let pending: Promise<void> | null = null;
type State = { colors: FrameColor[]; legacyColors: FrameColor[]; loaded: boolean; load: () => Promise<void>; add: (name: string, hex: string) => Promise<FrameColor> };
export const useFrameColorStore = create<State>((set, get) => ({
  colors: [], legacyColors: [], loaded: false,
  load: () => {
    if (get().loaded) return Promise.resolve();
    if (!pending) pending = api.get('/colors', { timeout: 15000 }).then(response => set({ ...response.data.data, loaded: true })).finally(() => { pending = null; });
    return pending;
  },
  add: async (name, hex) => {
    const response = await api.post('/colors', { name: name.trim(), hex }, { timeout: 30000 });
    const color = response.data.data.color as FrameColor;
    set(state => ({ colors: [...state.colors, color] }));
    return color;
  },
}));
export const resolveColorOption = (value: string | null | undefined, colors: FrameColor[], legacy: FrameColor[] = []): FrameColor => {
  const input = value?.trim() || '';
  return [...colors, ...legacy].find(color => color.hex.toLowerCase() === input.toLowerCase() || color.name.toLowerCase() === input.toLowerCase())
    ?? { name: input || '-', hex: /^#[a-f0-9]{6}$/i.test(input) ? input : '' };
};
export function useFrameColors() {
  const state = useFrameColorStore();
  const { load } = state;
  useEffect(() => { void load().catch(() => {}); }, [load]);
  return state;
}
