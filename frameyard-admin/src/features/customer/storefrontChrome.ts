import { create } from 'zustand';

/**
 * Whether the storefront chrome (deal banner, navbar, footer, mobile dock) is shown. Full-screen
 * pages such as log in / sign up switch it off while they are on screen; CustomerLayout reads it.
 */
type StorefrontChrome = { bare: boolean; setBare: (bare: boolean) => void };

export const useStorefrontChrome = create<StorefrontChrome>((set) => ({
  bare: false,
  setBare: (bare) => set({ bare }),
}));
