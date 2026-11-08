import type { FrameFinish } from './heroSlides';

/**
 * Frame types shown on the homepage. Plain data so names, copy and photos can later
 * come from the backend. Collage frames are intentionally not listed.
 */
export type FrameTypeCard = {
  id: string;
  name: string;
  /** Short word set large behind the photo. */
  word: string;
  description: string;
  finish: FrameFinish;
  photo: string;
  alt: string;
};

const unsplash = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=560&h=700&q=75`;

export const frameTypes: FrameTypeCard[] = [
  {
    id: 'wooden',
    name: 'Wooden Frames',
    word: 'Wooden',
    description: 'Natural beauty for timeless moments',
    finish: 'oak',
    photo: unsplash('photo-1500534623283-312aade485b7'),
    alt: 'A mountain landscape in a natural oak frame',
  },
  {
    id: 'metal',
    name: 'Metal Frames',
    word: 'Metal',
    description: 'Modern and minimal for a bold look',
    finish: 'metal',
    photo: unsplash('photo-1506794778202-cad84cf45f1d'),
    alt: 'A portrait in a slim brushed metal frame',
  },
  {
    id: 'classic',
    name: 'Classic Frames',
    word: 'Classic',
    description: 'Perfect for everyday memories',
    finish: 'black',
    photo: unsplash('photo-1511895426328-dc8714191300'),
    alt: 'A family photograph in a classic black frame',
  },
  {
    id: 'premium',
    name: 'Premium Frames',
    word: 'Premium',
    description: 'For your most special moments',
    finish: 'walnut',
    photo: unsplash('photo-1519681393784-d120267933ba'),
    alt: 'A starry mountain night in a deep walnut frame',
  },
  {
    id: 'custom',
    name: 'Custom Frames',
    word: 'Custom',
    description: 'Your photo. Your style. Uniquely framed.',
    finish: 'white',
    photo: unsplash('photo-1529156069898-49953e39b3ac'),
    alt: 'Friends laughing together in a white gallery frame',
  },
];
