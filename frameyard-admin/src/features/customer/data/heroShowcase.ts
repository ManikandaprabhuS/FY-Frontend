import plantCutout from '../../../assets/hero-palm.webp';
import moneyPlantCutout from '../../../assets/hero-money-plant.webp';
import monsteraCutout from '../../../assets/hero-monstera.webp';
import birdOfParadiseCutout from '../../../assets/hero-bird-of-paradise.webp';
import { heroSlides } from './heroSlides';

/**
 * Homepage hero: a gallery wall drawn in CSS with four frames, track lights and plants,
 * and the dummy photos shown inside the frames until the admin marks real hero photos
 * (see utils/heroFrames.ts).
 */

/** A potted palm on a transparent background, used either side of the wall. */
export const HERO_PLANT = plantCutout;

/** Desktop-only extras, also on transparent backgrounds: a tall bird of paradise and a small monstera. */
export const HERO_BIRD_OF_PARADISE = birdOfParadiseCutout;
export const HERO_MONSTERA = monsteraCutout;
/** A trailing money plant (pothos) in a white pot, for the book stack on the console. */
export const HERO_MONEY_PLANT = moneyPlantCutout;

/** Moulding finishes drawn in CSS (see .fy-wframe--* in hero.css). */
export type WallFrameFinish = 'black' | 'grey' | 'walnut' | 'red';

export type WallFrame = { id: string; finish: WallFrameFinish; label: string };

/** Left to right, exactly as in the reference: black, grey, walnut, red. */
export const wallFrames: WallFrame[] = [
  { id: 'black', finish: 'black', label: 'Black frame' },
  { id: 'grey', finish: 'grey', label: 'Grey frame' },
  { id: 'walnut', finish: 'walnut', label: 'Walnut frame' },
  { id: 'red', finish: 'red', label: 'Red frame' },
];

export type HeroPhoto = { src: string; srcSet?: string; alt: string };

/**
 * Dummy photos, kept separate from product data. They are only used while no product
 * image is marked as a hero photo; delete them (or pass `fallbackPhotos={[]}`) later
 * without changing the hero component.
 */
export const fallbackHeroPhotos: HeroPhoto[] = [
  ...heroSlides.map((slide) => ({ src: slide.photo, srcSet: slide.photoSrcSet, alt: slide.alt })),
  {
    src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=720&h=900&q=80',
    alt: 'A starry night over snowy mountains',
  },
];
