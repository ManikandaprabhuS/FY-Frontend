import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {loadEnv} from 'vite';

const env={...loadEnv('production',process.cwd(),''),...process.env};
const origin=new URL(env.VITE_SITE_URL||env.FRONTEND_URL||'https://frameyaad.netlify.app').origin;
const base=(env.VITE_API_URL||'http://localhost:5000/api/v1').replace(/\/+$/,'');
const api=base.endsWith('/api/v1')?base:`${base}/api/v1`;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const urls=new Set(['/', '/products','/frameyaad-arts','/contact','/book-appointment'].map(path=>origin+path));
let arts=[];
let verified=false;
try{
 for(let page=1;page<=10000;page++){
  const response=await fetch(`${api}/products/public?catalog=all&limit=100&page=${page}`,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`Catalog HTTP ${response.status}`);
  const payload=await response.json();const data=payload.data;
  if(!Array.isArray(data?.products))throw new Error('Unexpected catalog response');
  for(const product of data.products){urls.add(`${origin}/product/${encodeURIComponent(product.id)}`);if(product.isFrameyaadArt)arts.push(product);}
  if(page>=(data.pagination?.totalPages||1)){verified=true;break;}
 }
}catch(error){console.warn(`SEO catalog unavailable: ${error.message}. Product URLs require a rebuild when the API is available.`);}
await writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...urls].map(url=>`<url><loc>${escape(url)}</loc></url>`).join('')}</urlset>`);
let html=await readFile('dist/index.html','utf8');
html=html.replace(/<title>.*?<\/title>/s,'<title>FrameYaad Arts | FrameYaad</title>').replace('</head>',`<link rel="canonical" href="${origin}/frameyaad-arts"><meta name="description" content="Explore FrameYaad Arts and ready-to-hang art and frame sets."></head>`);
const content=arts.length?`<h1>FrameYaad Arts</h1>${arts.map(product=>`<a href="/product/${encodeURIComponent(product.id)}">${escape(product.productName||product.name)}</a>`).join('')}`:verified?`<h1>FrameYaad Arts - Coming soon</h1><p>We're curating ready-to-hang art and frame sets. Check back soon, or explore our custom frames in the meantime.</p><a href="/products">Browse frames</a>`:'<h1>FrameYaad Arts</h1>';
html=html.replace('<div id="root"></div>',`<div id="root">${content}</div>`);
await mkdir('dist/frameyaad-arts',{recursive:true});await writeFile('dist/frameyaad-arts/index.html',html);
