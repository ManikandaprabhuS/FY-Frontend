/** Optimized copies of this exact admin asset only; a replacement always uses its own URL. */
export const HERO_VIDEO_ORIGINAL = 'https://kiltmzomecjeucdeawmp.supabase.co/storage/v1/object/public/product-images/site/hero-video/1794317454303-76b64098-d874-460f-bfda-23bc8feafc62.mp4';
// Verified identical SHA-256 to the original, not an arbitrary replacement.
export const HERO_VIDEO_REUPLOAD = 'https://kiltmzomecjeucdeawmp.supabase.co/storage/v1/object/public/product-images/site/hero-video/1795268150335-9c75fe36-ded0-441e-9260-59f9e990300d.mp4';
// The video's own first frame (0:00), so the start never flashes a later scene before playback.
export const HERO_VIDEO_POSTER = '/hero/poster-start-bb66a7b681e6.webp';
export const heroNeedsSmallVideo = (connection?: {saveData?:boolean;effectiveType?:string;downlink?:number}) => Boolean(connection?.saveData || ['slow-2g','2g','3g'].includes(connection?.effectiveType??'') || (typeof connection?.downlink==='number'&&connection.downlink>0&&connection.downlink<=2));
export function heroVideoMedia(url: string, compact: boolean) {
  if (![HERO_VIDEO_ORIGINAL,HERO_VIDEO_REUPLOAD].includes(url.split('#')[0])) return { src: url, poster: HERO_VIDEO_POSTER };
  return {
    src: compact ? '/hero/mobile-4c170a80ef5f.mp4' : '/hero/desktop-acbd8e83f55a.mp4',
    poster: HERO_VIDEO_POSTER,
  };
}
