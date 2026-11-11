import React, { useEffect, useRef, useState } from 'react';
import { Film, Loader2, Trash2, Upload } from 'lucide-react';

import { getApiErrorMessage } from '../../services/api';
import { HERO_VIDEO_MAX_BYTES, siteMediaService, type HeroVideo } from '../../services/site-media.service';
import { showError, showSuccess } from '../../utils/toast';

/**
 * Settings → Homepage: the video shown on the second slide of the homepage hero.
 * Uploading replaces the current video; the homepage picks it up within a minute.
 */
const HeroVideoSettings: React.FC = () => {
  const [video, setVideo] = useState<HeroVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = progress !== null || removing;

  useEffect(() => {
    let active = true;
    siteMediaService.getHeroVideo()
      .then((current) => { if (active) setVideo(current); })
      .catch((error: unknown) => { if (active) showError(getApiErrorMessage(error, 'Unable to load the homepage video.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const upload = async (file: File) => {
    if (file.type !== 'video/mp4') {
      showError('Choose an MP4 video.');
      return;
    }
    if (file.size > HERO_VIDEO_MAX_BYTES) {
      showError('The video must be 10 MB or smaller.');
      return;
    }
    setProgress(0);
    try {
      setVideo(await siteMediaService.uploadHeroVideo(file, setProgress));
      showSuccess('Homepage video updated.');
    } catch (error) {
      showError(getApiErrorMessage(error, 'Unable to upload the video.'));
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    if (!window.confirm('Remove the homepage video? The homepage will show only the frames slide.')) return;
    setRemoving(true);
    try {
      await siteMediaService.removeHeroVideo();
      setVideo(null);
      showSuccess('Homepage video removed.');
    } catch (error) {
      showError(getApiErrorMessage(error, 'Unable to remove the video.'));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 md:p-8 shadow-sm animate-fade-in">
      <h2 className="text-xl font-semibold text-on-surface">Homepage hero video</h2>
      <p className="text-sm text-on-surface-variant mt-1 mb-6">
        Shown on the second slide of the homepage hero, after the frames. MP4, up to 10 MB. Short, silent loops work best.
      </p>

      <div className="aspect-video w-full overflow-hidden rounded-xl border border-outline-variant bg-surface-container grid place-items-center">
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin text-on-surface-variant" aria-label="Loading" />
        ) : video ? (
          <video key={video.url} src={video.url} className="h-full w-full object-cover" controls muted playsInline preload="metadata" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-on-surface-variant">
            <Film className="w-8 h-8 opacity-50" />
            <p className="text-sm">No video yet. The homepage shows only the frames slide.</p>
          </div>
        )}
      </div>

      {video?.updatedAt && (
        <p className="text-xs text-on-surface-variant mt-3">
          Last updated {new Date(video.updatedAt).toLocaleString()}
        </p>
      )}

      {progress !== null && (
        <div className="mt-4" role="status">
          <div className="h-2 w-full rounded-full bg-surface-container overflow-hidden">
            <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-on-surface-variant mt-1">Uploading… {progress}%</p>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3 pt-6 mt-6 border-t border-outline-variant">
        {video && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-outline-variant text-on-surface rounded-xl font-semibold hover:bg-surface-variant/50 transition-all disabled:opacity-50"
          >
            {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Remove video
          </button>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl font-semibold shadow-sm hover:bg-primary/95 transition-all disabled:opacity-50"
        >
          {progress !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {video ? 'Replace video' : 'Upload video'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>
    </div>
  );
};

export default HeroVideoSettings;
