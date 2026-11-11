import api from './api';
export interface OrderPhotoInfo { imageId: string; fileName: string; sizeBytes: number }
export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;
export function validateOrderPhoto(file: File): string | null {
  if (!file.size) return 'Please choose a non-empty photo.';
  if (file.size > PHOTO_MAX_BYTES) return 'Photo must be 4 MB or smaller';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Please choose a JPG, PNG or WebP photo.';
  return null;
}
export const orderPhotoService = {
  current: async () => (await api.get<{data: OrderPhotoInfo | null}>('/order-photos/temp', {timeout: 15000})).data.data,
  upload: async (file: File, onProgress: (value: number) => void) => {
    const body = new FormData(); body.append('photo', file);
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
