'use strict';

// Thanks to Jeremy Keith: https://adactio.com/journal/11730

// Import Jake's polyfill for async waitUntil
importScripts('/async-waituntil.js');

const version = 'v0.010::';
const staticCacheName = version + 'static';

function updateStaticCache() {
  return caches.open(staticCacheName)
  .then( cache => {
    // These items won't block the installation of the Service Worker
    cache.addAll([
      '/favicon.ico',
      '/manifest.json',
      'https://rebel-yak.glitch.me/drawings',
      'https://pagead2.googlesyndication.com/pub-config/r20160913/ca-pub-6749834995443806.js',
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
    ]);
    // These items must be cached for the Service Worker to complete installation
    return cache.addAll([
      '/',
      '/index.html',
      '/style.css',
      '/main.js',
      'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.5/angular.min.js',
      'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.5/angular-animate.min.js',
      'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.5/angular-aria.min.js',
      'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.5/angular-messages.min.js',
      'https://ajax.googleapis.com/ajax/libs/angular_material/1.1.1/angular-material.min.js',
      'https://www.google-analytics.com/analytics.js',
      'https://ajax.googleapis.com/ajax/libs/angular_material/1.1.1/angular-material.min.css',
      'https://fonts.googleapis.com/css?family=Baloo+Bhaina|Roboto:400,500',
      'https://fonts.gstatic.com/s/roboto/v15/oMMgfZMQthOryQo9n22dcuvvDin1pK8aKteLpeZ5c0A.woff2',
      'https://fonts.gstatic.com/s/baloobhaina/v1/HxxbxOVf9WQem_hKo1MXShampu5_7CjHW5spxoeN3Vs.woff2'
      'https://fonts.gstatic.com/s/roboto/v15/RxZJdnzeo3R5zSexge8UUZBw1xU1rKptJj_0jans920.woff2'
    ]);
  });
}

// Remove caches whose name is no longer valid
function clearOldCaches() {
  return caches.keys()
  .then( keys => {
    return Promise.all(keys
      .filter(key => key.indexOf(version) !== 0)
      .map(key => caches.delete(key))
    );
  });
}

self.addEventListener('install', event => {
  event.waitUntil(
    updateStaticCache()
    .then( () => self.skipWaiting() )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    clearOldCaches()
    .then( () => self.clients.claim() )
  );
});

self.addEventListener('fetch', event => {
  let request = event.request;
  // Look in the cache first, fall back to the network
  event.respondWith(
    // CACHE
    caches.match(request)
    .then( responseFromCache => {
      // Did we find the file in the cache?
      if (responseFromCache) {
        // If so, fetch a fresh copy from the network in the background
        // (using the async waitUntil polyfill)
        event.waitUntil(
          // NETWORK
          fetch(request)
          .then( responseFromFetch => {
            // Stash the fresh copy in the cache
            caches.open(staticCacheName)
            .then( cache => {
              cache.put(request, responseFromFetch);
            });
          })
        );
        return responseFromCache;
      }
      // NETWORK
      // If the file wasn't in the cache, make a network request
      fetch(request)
      .then( responseFromFetch => {
        // Stash a fresh copy in the cache in the background
        // (using the async waitUntil polyfill)
        let responseCopy = responseFromFetch.clone();
        event.waitUntil(
          caches.open(staticCacheName)
          .then( cache => {
            cache.put(request, responseCopy);
          })
        );
        return responseFromFetch;
      })
      .catch( () => {
        // OFFLINE
        // If the request is for a page, show an offline message
        //if (request.headers.get('Accept').indexOf('text/html') !== -1) {
        //  return caches.match('/offline/');
        //}
      });
    })
  );
});