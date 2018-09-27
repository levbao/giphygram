//sw version
const version = '1.1';

//static cache - app shell
const appAssets = [
    'index.html',
    'main.js',
    'images/flame.png',
    'images/logo.png',
    'images/sync.png',
    'vendor/bootstrap.min.css',
    'vendor/jquery.min.js'
];

//sw install
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(`static-${version}`).then(cache => cache.addAll(appAssets))
    );
});

//sw activate
self.addEventListener('activate', e => {
    //clean static cache
    let cleaned = caches.keys().then(keys => {
        keys.forEach(key => {
            if(key!==`static-${version}` && key.match('static-')) {
                return caches.delete(key);
            }
        });
    });
    e.waitUntil(cleaned);
});

//clean old Giphys from the 'giphy' cache
const cleanGiphyCache =(giphys) => {
    caches.open('giphy').then(cache => {
        //get all cache entries
        cache.keys().then(keys => {
            //loop entries (rquests)
            keys.forEach(key => {
                //if entry is NOT part of current Giphys, delete
                if(!giphys.includes(key.url)) cache.delete(key);
            })
        })
    })
}

//static cache strategy - cache with network fall back
const staticCache = (req, cacheName = `static-${version}`) => {
    return caches.match(req).then(cachedRes => {
        //return cached response if found
        if(cachedRes) return cachedRes;

        //otherwise fallback to network
        return fetch(req).then(networkRes => {
            //update cache with new response
            caches.open(cacheName)
                .then(cache => cache.put(req, networkRes));

            //return clone of network response
            return networkRes.clone();
        })
    })
}


const fallbackCache = (req) => {
    // try network
    return fetch(req).then(networkRes => {
        //check res is OK, else go to cache
        if(!networkRes.ok) throw 'Fetch error';

        //update cache
        caches.open(`static-${version}`).then(cache => cache.put(req, networkRes));

        //return clone of network response
        return networkRes.clone();
    })
    //try cache
    .catch( err => caches.match(req));
}

//sw fetch
self.addEventListener('fetch', e => {
    //app shell
    if(e.request.url.match(location.origin)) {
        e.respondWith(staticCache(e.request));

    } else if (e.request.url.match('api.giphy.com/v1/gifs/trending')) { //Giphy aPI
        e.respondWith(fallbackCache(e.request));

    } else if(e.request.url.match('giphy.com/media')) {//giphy media
        e.respondWith(staticCache(e.request, 'giphy'));
    }
});

//listen for message from client
self.addEventListener('message', e => {
    //identify the message
    if(e.data.action === 'cleanGiphyCache') cleanGiphyCache(e.data.giphys);
})