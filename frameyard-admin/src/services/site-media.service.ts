import api from './api';

/** The homepage hero video, managed by staff from Settings → Homepage. */
export type HeroVideo = { url: string; updatedAt: string | null };

export const HERO_VIDEO_MAX_BYTES = 10 * 1024 * 1024;
let heroCache: { value: HeroVideo | null; expires: number } | undefined;
let heroRequest: Promise<HeroVideo | null> | undefined;

export const siteMediaService = {
  getHeroVideo: async () => {
    if (heroCache && heroCache.expires > Date.now()) return heroCache.value;
    if (!heroRequest) heroRequest = api.get('/site-media/hero-video').then(response => {
      const value = (response.data.data?.video ?? null) as HeroVideo | null;
      heroCache = { value, expires: Date.now() + 60_000 };
      return value;
    }).finally(() => { heroRequest = undefined; });
    return heroRequest;
  },
  uploadHeroVideo: async (file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append('video', file);
    const response = await api.put('/site-media/hero-video', form, {
      timeout: 120_000,
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    heroCache = undefined;
    return response.data.data.video as HeroVideo;
  },
  removeHeroVideo: async () => {
    await api.delete('/site-media/hero-video');
    heroCache = undefined;
  },
};
