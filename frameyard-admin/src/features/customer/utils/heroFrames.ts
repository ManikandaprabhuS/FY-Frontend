import type { Product } from '../../../types';
import type { HeroPhoto } from '../data/heroShowcase';

const MAX_PHOTOS = 4;

const isUsableUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^(https?:\/\/|\/)/.test(value.trim());

/**
 * Photos for the hero frames, taken from active products' images that the admin has
 * marked as hero photos (`images[].isHeroImage`), in catalogue order, up to four.
 * Images that failed to load are skipped by URL, so a replaced image is tried again.
 * Returns an empty list until at least one image is marked.
 */
export const backendHeroPhotos = (products: Product[], brokenUrls: ReadonlySet<string> = new Set()): HeroPhoto[] =>
  products
    .filter((product) => product.isActive)
    .flatMap((product) =>
      (product.images ?? [])
        .filter((image) => image.isHeroImage && isUsableUrl(image.imageUrl) && !brokenUrls.has(image.imageUrl.trim()))
        .map((image) => ({ src: image.imageUrl.trim(), alt: product.name })),
    )
    .slice(0, MAX_PHOTOS);
