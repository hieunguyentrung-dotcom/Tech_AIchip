/* Service worker: app shell offline + video from cache with Range support */
const SHELL='aic-shell-v1', VIDEO='aic-video-v1';
const ASSETS=['./','index.html','manifest.webmanifest','poster.jpg','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==SHELL&&k!==VIDEO).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function videoResponse(req){
  const cached=await caches.open(VIDEO).then(c=>c.match('video.mp4'));
  if(!cached)return fetch(req);
  const blob=await cached.blob();const size=blob.size;const range=req.headers.get('range');
  if(!range)return new Response(blob,{status:200,headers:{'Content-Type':'video/mp4','Content-Length':String(size),'Accept-Ranges':'bytes'}});
  const m=/bytes=(\d*)-(\d*)/.exec(range);let start=m&&m[1]?+m[1]:0;let end=m&&m[2]?+m[2]:size-1;end=Math.min(end,size-1);
  return new Response(blob.slice(start,end+1),{status:206,headers:{'Content-Type':'video/mp4','Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
}
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.origin!==location.origin)return;
  if(url.pathname.endsWith('video.mp4')){e.respondWith(videoResponse(req));return}
  if(req.mode==='navigate'){e.respondWith(fetch(req).then(r=>{const cp=r.clone();caches.open(SHELL).then(c=>c.put('index.html',cp));return r}).catch(()=>caches.match('index.html')));return}
  e.respondWith(caches.match(req).then(hit=>{const net=fetch(req).then(r=>{if(r.ok){const cp=r.clone();caches.open(SHELL).then(c=>c.put(req,cp))}return r}).catch(()=>hit);return hit||net}));
});
