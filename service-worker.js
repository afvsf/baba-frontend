const CACHE_NAME = 'baba-v2';

const urlsToCache = [
  './',
  './index.html',
  './admin.html'
];

self.addEventListener('install', event => {

  event.waitUntil(

    caches.open(CACHE_NAME)
    .then(async cache => {

      for(const url of urlsToCache){

        try{

          await cache.add(url);

          console.log('✅ Cache OK:', url);

        }catch(err){

          console.error('❌ Erro Cache:', url, err);

        }

      }

    })

  );

});

self.addEventListener('fetch', event => {

  event.respondWith(

    caches.match(event.request)
    .then(response => response || fetch(event.request))

  );

});
