import api from './api';
export interface OrderPhotoInfo { imageId: string; fileName: string; sizeBytes: number }
import {getPhotoMaxBytes,photoSizeError,type PhotoLimitVariant} from "../utils/photo-limits";
export const PHOTO_MAX_BYTES = getPhotoMaxBytes([]);
export function validateOrderPhoto(file: File, variants:readonly PhotoLimitVariant[]=[]): string | null {
  if (!file.size) return 'Please choose a non-empty photo.';
  const maxBytes=getPhotoMaxBytes(variants);if(file.size>maxBytes)return photoSizeError(file.size,maxBytes);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Please choose a JPG, PNG or WebP photo.';
  return null;
}
export const orderPhotoService = {
  current: async () => (await api.get<{data: OrderPhotoInfo | null}>('/order-photos/temp', {timeout: 15000})).data.data,
  upload: async (file: File, onProgress: (value: number) => void, items?:unknown) => {
    const body = new FormData(); body.append('photo', file);if(items)body.append('items',JSON.stringify(items));
    return (await api.post<{data: OrderPhotoInfo}>('/order-photos', body, { timeout: 45000, onUploadProgress: event => onProgress(event.total ? Math.round(event.loaded / event.total * 100) : 0) })).data.data;
  },
  clear: async (id: string) => { await api.delete('/order-photos/' + encodeURIComponent(id), {timeout: 15000}); },
  download: async (orderId: string) => {
    const {data} = await api.get<{data: {url: string; fileName: string}}>('/orders/' + encodeURIComponent(orderId) + '/photo/download-url', {timeout: 15000});
    const link = document.createElement('a');
    link.href = data.data.url; link.download = data.data.fileName; link.rel = 'noopener noreferrer';
    document.body.appendChild(link); link.click(); link.remove();
  },
};
// Browser-local only until checkout. No file data or signed URL is persisted in storage.
let draft: {userId: string; file: File} | undefined;
export function setCheckoutPhotoDraft(userId: string, file: File) { draft = {userId, file}; }
export function checkoutPhotoDraft(userId: string) { return draft?.userId === userId ? draft.file : undefined; }
export function clearCheckoutPhotoDraft(userId: string, expectedFile?: File) { if (draft?.userId === userId && (!expectedFile || draft.file === expectedFile)) draft = undefined; }
