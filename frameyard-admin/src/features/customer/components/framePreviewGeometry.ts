export interface FrameRatio { width: number; height: number; label: string }
// Shared by the crop editor and composed preview, independent of product identity.
export const ratioFromFrameSize = (frameSize?: string): FrameRatio => {
  const values = frameSize?.match(/\d+(?:\.\d+)?/g)?.map(Number);
  if (!values || values.length < 2 || !Number.isFinite(values[0]) || !Number.isFinite(values[1]) || values[0] <= 0 || values[1] <= 0) return { width: 4, height: 5, label: frameSize || 'selected' };
  return { width: values[0], height: values[1], label: frameSize || `${values[0]} × ${values[1]}` };
};
export const selectVariantPhoto = (crops: Record<string, string>, key: string, source: string): string => {
  // An explicit empty value means this size was cleared; don't resurrect it.
  if (Object.prototype.hasOwnProperty.call(crops, key)) return crops[key] || '';
  return source || Object.values(crops).find(value => Boolean(value)) || '';
};
export const parseStoredCrops = (raw: string | null): Record<string, string> => {
  try {
    const value: unknown = JSON.parse(raw || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  } catch { return {}; }
};
export const fitPhotoRect = (opening: { x: number; y: number; width: number; height: number }, ratio: number) => {
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 4 / 5;
  const width = Math.min(opening.width, opening.height * safeRatio);
  const height = width / safeRatio;
  return { x: opening.x + (opening.width - width) / 2, y: opening.y + (opening.height - height) / 2, width, height };
};
export const resolvePreviewFrameImage = (displayImage: string, defaultImage: string, configured: (image: string) => boolean): string => {
  if (configured(displayImage)) return displayImage;
  if (configured(defaultImage)) return defaultImage;
  return defaultImage || displayImage;
};
