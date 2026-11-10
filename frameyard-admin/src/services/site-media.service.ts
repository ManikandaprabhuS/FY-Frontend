import api from './api';

/** The homepage hero video, managed by staff from Settings → Homepage. */
export type HeroVideo = { url: string; updatedAt: string | null };

export const HERO_VIDEO_MAX_BYTES = 10 * 1024 * 1024;

export const siteMediaService = {
  getHeroVideo: async () => {
    const response = await api.get('/site-media/hero-video');
    return (response.data.data?.video ?? null) as HeroVideo | null;
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
    return response.data.data.video as HeroVideo;
  },
  removeHeroVideo: async () => {
    await api.delete('/site-media/hero-video');
  },
};
