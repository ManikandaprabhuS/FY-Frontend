export interface LocalPhoto {
 id:string; file:Blob; name:string; source:string; crops:Record<string,string>;
 productId?:string; cartKey?:string; createdAt:number;
}
const TTL=24*60*60*1000;
const memory=new Map<string,LocalPhoto>();
const deleted=new Set<string>();
let database:Promise<IDBDatabase>|undefined;
let fallback=false;
export const photoSelectionKey=(productId:string,variantId:string,color?:string|null)=>productId+':'+variantId+':'+(color??'').trim().toLowerCase();
function open():Promise<IDBDatabase>{
 if(!database)database=new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined'){reject(new Error('IndexedDB unavailable'));return;}
  const request=indexedDB.open('frameyaad-local-photos',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('photos',{keyPath:'id'});
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
  request.onblocked=()=>reject(new Error('Photo storage is blocked'));
 });
 return database;
}
async function transaction<T>(mode:IDBTransactionMode,action:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
 const db=await open();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('photos',mode),request=action(tx.objectStore('photos'));
  tx.oncomplete=()=>resolve(request.result);
  tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 });
}
export async function saveLocalPhoto(photo:LocalPhoto):Promise<boolean>{
 deleted.delete(photo.id);memory.set(photo.id,photo);
 try{await transaction('readwrite',s=>s.put(photo));return true;}catch{fallback=true;return false;}
}
export async function removeLocalPhoto(id:string):Promise<void>{
 deleted.add(id);memory.delete(id);
 try{await transaction('readwrite',s=>s.delete(id));}catch{fallback=true;}
}
export async function listLocalPhotos():Promise<LocalPhoto[]>{
 let rows:LocalPhoto[];
 try{rows=await transaction<LocalPhoto[]>('readonly',s=>s.getAll());for(const row of rows)if(!memory.has(row.id)&&!deleted.has(row.id))memory.set(row.id,row);}
 catch{fallback=true;}
 const now=Date.now(),valid:LocalPhoto[]=[];
 for(const row of memory.values()){
  if(now-row.createdAt>=TTL){await removeLocalPhoto(row.id);}else valid.push(row);
 }
 return valid;
}
export async function findProductPhoto(productId:string){return(await listLocalPhotos()).find(p=>p.productId===productId&&!p.cartKey);}
export async function linkProductPhoto(productId:string,cartKey:string){
 const photo=await findProductPhoto(productId);
 if(photo)await saveLocalPhoto({...photo,id:'cart:'+cartKey,cartKey});
}
export async function removeCartPhotos(keys:readonly string[]){
 for(const photo of await listLocalPhotos())if(photo.cartKey&&keys.includes(photo.cartKey)){
  await removeLocalPhoto(photo.id);
  if(photo.productId){const draft=await findProductPhoto(photo.productId);if(draft)await removeLocalPhoto(draft.id);}
 }
}
export function localPhotoStorageFallback(){return fallback;}
export function croppedPhotoFile(photo:LocalPhoto,cropKey?:string):File{
 const image=(cropKey&&photo.crops[cropKey])||Object.values(photo.crops)[0];
 if(!image)return new File([photo.file],photo.name,{type:photo.file.type});
 const match=/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(image);
 if(!match)throw new Error('The saved crop could not be opened.');
 const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
 return new File([bytes],photo.name.replace(/\.[^.]*$/,'')+'.'+(match[1]==='image/jpeg'?'jpg':match[1].split('/')[1]),{type:match[1]});
}
