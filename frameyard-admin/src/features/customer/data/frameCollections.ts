import type { HeroPhoto } from './heroShowcase';
import { fallbackHeroPhotos } from './heroShowcase';

/**
 * The four frame collections on the homepage. Each one links to the shop with the
 * materials that belong to it ticked in the filter (see `materialsForCollection`).
 *
 * Photos: until the admin can attach a photo to each collection, the dummy hero photos
 * stand in. Swap `fallbackPhoto` for the admin's image when that API exists, the same
 * way the hero frames switch from dummy photos to admin-marked ones.
 */
export type FrameCollectionId = 'classic' | 'metal' | 'wooden' | 'premium';

export type FrameCollection = {
  id: FrameCollectionId;
  name: string;
  /** Matches the shop's material names (from the products' materials) for this collection. */
  materialPattern: RegExp;
  fallbackPhoto: HeroPhoto;
};

const photo = (index: number): HeroPhoto => fallbackHeroPhotos[index % fallbackHeroPhotos.length];

export const frameCollections: FrameCollection[] = [
  { id: 'classic', name: 'Classic frames', materialPattern: /classic|mdf|polymer|synthetic|composite|plastic/i, fallbackPhoto: photo(0) },
  { id: 'metal', name: 'Metal frames', materialPattern: /metal|alumin|steel|iron|brass|copper/i, fallbackPhoto: photo(1) },
  { id: 'wooden', name: 'Wooden frames', materialPattern: /wood|walnut|oak|teak|maple|pine|ash|bamboo/i, fallbackPhoto: photo(2) },
  { id: 'premium', name: 'Premium frames', materialPattern: /premium|gold|gilded|velvet|leather|hand/i, fallbackPhoto: photo(3) },
];

/** The shop link for a collection; the shop reads `collection` and ticks its materials. */
export const collectionShopPath = (id: FrameCollectionId) => `/products?collection=${id}`;

/** The shop's material values that belong to a collection (empty when none match yet). */
export const materialsForCollection = (collectionId: string | null, materials: string[]): string[] => {
  const collection = frameCollections.find((item) => item.id === collectionId);
  return collection ? materials.filter((material) => collection.materialPattern.test(material)) : [];
};
