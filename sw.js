"use strict";

console.log('WORKER: executing.');

/* From Chris Coyier's Simple-Offline-Site:
   https://github.com/chriscoyier/Simple-Offline-Site/blob/master/js/service-worker.js
*/
var version = 'version_003454';
var offlineFundamentals = [
  '',
  '/style.css',
  '/main.js',
  'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.5/angular.min.js',
  'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.5/angular-animate.min.js',
  'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.5/angular-aria.min.js',
  'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.5/angular-messages.min.js',
  'https://ajax.googleapis.com/ajax/libs/angular_material/1.1.1/angular-material.min.js',
  'https://ajax.googleapis.com/ajax/libs/angular_material/1.1.1/angular-material.min.css',
  'https://fonts.googleapis.com/css?family=Baloo+Bhaina&text=.:!$0123456789AaBbCcDdEefghIiJKklMmNnOoPpqRrSsTtuWwYy%26%27',
  'https://fonts.gstatic.com/l/font?kit=HxxbxOVf9WQem_hKo1MXSke-eulccCtVFLHceWDlTfI4pIB3tCLOrGswD0UjCnloa4s7J0wFqANOkin20ndrJaD5Mle__GwPI2Ni-b6Se3U&skey=3699402d0d6ef054&v=v1',
  'https://fonts.googleapis.com/css?family=Roboto:400,500',
  'https://fonts.gstatic.com/s/roboto/v16/CrYjSnGjrRCn0pd9VQsnFOvvDin1pK8aKteLpeZ5c0A.woff',
  'https://fonts.gstatic.com/s/roboto/v16/RxZJdnzeo3R5zSexge8UUbO3LdcAZYWl9Si6vvxL-qU.woff'
];

self.addEventListener("install", function(event) {
  console.log('WORKER: install event in progress.');
  event.waitUntil(
    caches
      .open(version + 'fundamentals')
      .then(function(cache) {
        return cache.addAll(offlineFundamentals);
      })
      .then(function() {
        console.log('WORKER: install completed');
      })
  );
});

self.addEventListener("fetch", function(event) {
  console.log('WORKER: fetch event in progress.');
  if (event.request.method !== 'GET') {
    console.log('WORKER: fetch event ignored.', event.request.method, event.request.url);
    return;
  }
  event.respondWith(
    caches
      .match(event.request)
      .then(function(cached) {
        var networked = fetch(event.request)
          .then(fetchedFromNetwork, unableToResolve)
          .catch(unableToResolve);
        console.log('WORKER: fetch event', cached ? '(cached)' : '(network)', event.request.url);
        return cached || networked;
        function fetchedFromNetwork(response) {
          var cacheCopy = response.clone();
          console.log('WORKER: fetch response from network.', event.request.url);
          caches
            .open(version + 'pages')
            .then(function add(cache) {
              return cache.put(event.request, cacheCopy);
            })
            .then(function() {
              console.log('WORKER: fetch response stored in cache.', event.request.url);
            });
            return response;
        }
        function unableToResolve () {
          console.log('WORKER: fetch request failed in both cache and network.');
          return new Response('<h1>Service Unavailable</h1>', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/html'
            })
          });
        }
      })
  );
});

self.addEventListener("activate", function(event) {
  console.log('WORKER: activate event in progress.');
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return !key.startsWith(version);
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function() {
        console.log('WORKER: activate completed.');
      })
  );
});