/** Optimized copies of this exact admin asset only; a replacement always uses its own URL. */
export const HERO_VIDEO_ORIGINAL = 'https://kiltmzomecjeucdeawmp.supabase.co/storage/v1/object/public/product-images/site/hero-video/1794317454303-76b64098-d874-460f-bfda-23bc8feafc62.mp4';
export const HERO_VIDEO_POSTER = '/hero/poster-7bc3f139be3a.webp';
export const heroNeedsSmallVideo = (connection?: {saveData?:boolean;effectiveType?:string;downlink?:number}) => Boolean(connection?.saveData || ['slow-2g','2g','3g'].includes(connection?.effectiveType??'') || (typeof connection?.downlink==='number'&&connection.downlink>0&&connection.downlink<=2));
export function heroVideoMedia(url: string, compact: boolean) {
  if (url.split('#')[0] !== HERO_VIDEO_ORIGINAL) return { src: url, poster: undefined };
  return {
    src: compact ? '/hero/mobile-6bbf68c78f67.mp4' : '/hero/desktop-b377f283777c.mp4',
    poster: HERO_VIDEO_POSTER,
  };
}
