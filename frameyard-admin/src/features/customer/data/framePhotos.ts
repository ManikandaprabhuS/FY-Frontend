import couple160 from '../../../assets/hero-frames/couple-160.webp';
import couple280 from '../../../assets/hero-frames/couple-280.webp';
import couple420 from '../../../assets/hero-frames/couple-420.webp';
import taj160 from '../../../assets/hero-frames/taj-160.webp';
import taj280 from '../../../assets/hero-frames/taj-280.webp';
import taj420 from '../../../assets/hero-frames/taj-420.webp';
import himalaya160 from '../../../assets/hero-frames/himalaya-160.webp';
import himalaya280 from '../../../assets/hero-frames/himalaya-280.webp';
import himalaya420 from '../../../assets/hero-frames/himalaya-420.webp';
import father160 from '../../../assets/hero-frames/father-160.webp';
import father280 from '../../../assets/hero-frames/father-280.webp';
import father420 from '../../../assets/hero-frames/father-420.webp';
import classic120 from '../../../assets/collection-photos/classic-120.webp';
import classic240 from '../../../assets/collection-photos/classic-240.webp';
import classic360 from '../../../assets/collection-photos/classic-360.webp';
import metal120 from '../../../assets/collection-photos/metal-120.webp';
import metal240 from '../../../assets/collection-photos/metal-240.webp';
import metal360 from '../../../assets/collection-photos/metal-360.webp';
import wooden120 from '../../../assets/collection-photos/wooden-120.webp';
import wooden240 from '../../../assets/collection-photos/wooden-240.webp';
import wooden360 from '../../../assets/collection-photos/wooden-360.webp';
import premium120 from '../../../assets/collection-photos/premium-120.webp';
import premium240 from '../../../assets/collection-photos/premium-240.webp';
import premium360 from '../../../assets/collection-photos/premium-360.webp';
import type { HeroPhoto } from './heroShowcase';

/**
 * Stand-in photographs for the homepage frames, shown until the admin supplies real ones
 * (admin-marked hero photos still replace the wall's set). One direction across both sets:
 * natural light, warm muted colour, real moments.
 *
 * Each file is cropped to its frame's opening, so it shows whole with no further cut:
 * - Wall frames: 0.676 (width / height), at most ~138 CSS px wide, files 160/280/420w.
 * - Collection frames: classic and wooden 0.648, metal 0.671, premium 0.633, at most
 *   ~120 CSS px wide, files 120/240/360w.
 *
 * Free photos under the Unsplash License (https://unsplash.com/license), by Unsplash id:
 * couple g9nDch_ERew (Negar Nikkhah), taj BCEexmxL9EQ (Fahrul Azmi), himalaya e85HNUarrbI (Naman Sood),
 * father svgtDd5clGc (Mukesh Sharma), classic UnWadQg_Whc (Mehedi Hasan),
 * metal 68hiY2IwnUg (Abhishek R), wooden pfLyzuGfofY (Ajmal MK), premium STxCZZX64Bg (Abrar Mohd).
 */

const wallSrcSet = (small: string, medium: string, large: string) => `${small} 160w, ${medium} 280w, ${large} 420w`;
const collectionSrcSet = (small: string, medium: string, large: string) => `${small} 120w, ${medium} 240w, ${large} 360w`;

/** Left to right with the wall's frames: black, grey, walnut, red. */
export const wallFramePhotos: HeroPhoto[] = [
  { src: couple280, srcSet: wallSrcSet(couple160, couple280, couple420), alt: 'A couple holding each other close, in black and white' },
  { src: taj280, srcSet: wallSrcSet(taj160, taj280, taj420), alt: 'The Taj Mahal reflected in its long pool' },
  { src: himalaya280, srcSet: wallSrcSet(himalaya160, himalaya280, himalaya420), alt: 'A snow-capped Himalayan peak above pine trees' },
  { src: father280, srcSet: wallSrcSet(father160, father280, father420), alt: 'A father lifting his child against the sunset' },
];

/** One photo per collection, matched to its frame: timeless, modern, natural, occasion. */
export const collectionFramePhotos = {
  classic: { src: classic240, srcSet: collectionSrcSet(classic120, classic240, classic360), alt: 'A woman in a sari walking through a park in sunlight' },
  metal: { src: metal240, srcSet: collectionSrcSet(metal120, metal240, metal360), alt: 'A Mumbai street at golden hour' },
  wooden: { src: wooden240, srcSet: collectionSrcSet(wooden120, wooden240, wooden360), alt: 'A wooden canoe on the Kerala backwaters at sunset' },
  premium: { src: premium240, srcSet: collectionSrcSet(premium120, premium240, premium360), alt: 'A bride and groom in wedding attire' },
} satisfies Record<'classic' | 'metal' | 'wooden' | 'premium', HeroPhoto>;
