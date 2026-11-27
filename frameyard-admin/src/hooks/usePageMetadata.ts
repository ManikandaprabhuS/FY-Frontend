import {useEffect} from 'react';
export function usePageMetadata(title:string|undefined,description:string,path:string){
 useEffect(()=>{if(!title)return;const previousTitle=document.title;document.title=title;
  const oldMeta=document.querySelector<HTMLMetaElement>('meta[name="description"]'),oldCanonical=document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const meta=oldMeta??document.createElement('meta'),canonical=oldCanonical??document.createElement('link');
  const previousDescription=meta.getAttribute('content'),previousCanonical=canonical.getAttribute('href');
  meta.name='description';meta.content=description;canonical.rel='canonical';canonical.href=new URL(path,import.meta.env.VITE_SITE_URL||window.location.origin).href;
  if(!oldMeta)document.head.append(meta);if(!oldCanonical)document.head.append(canonical);
  return()=>{document.title=previousTitle;if(oldMeta){if(previousDescription===null)meta.removeAttribute('content');else meta.content=previousDescription;}else meta.remove();if(oldCanonical){if(previousCanonical===null)canonical.removeAttribute('href');else canonical.href=previousCanonical;}else canonical.remove();};
 },[title,description,path]);
}
