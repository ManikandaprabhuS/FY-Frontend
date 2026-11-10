import { create } from 'zustand';

/**
 * The homepage's photo switch, shared by every section that shows frames (the hero wall
 * and the collections). Off: empty frames. On: the photos appear inside them.
 */
interface FramePhotosState {
  photosOn: boolean;
  togglePhotos: () => void;
}

export const useFramePhotosStore = create<FramePhotosState>((set) => ({
  photosOn: false,
  togglePhotos: () => set((state) => ({ photosOn: !state.photosOn })),
}));
