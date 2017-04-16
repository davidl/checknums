'use strict';

// Version of the offline cache (change this value everytime you want to update cache)
var CACHE_NAME = 'version_0035'

// Add a path you want to cache in this list.
var URLS = [                
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.5/angular.min.js',
  'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.5/angular-animate.min.js',
  'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.5/angular-aria.min.js',
  'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.5/angular-messages.min.js',
  'https://ajax.googleapis.com/ajax/libs/angular_material/1.1.1/angular-material.min.js',
  'https://ajax.googleapis.com/ajax/libs/angular_material/1.1.1/angular-material.min.css',
  'https://fonts.googleapis.com/css?family=Baloo+Bhaina|Roboto:400,500',
  'https://fonts.gstatic.com/s/baloobhaina/v1/HxxbxOVf9WQem_hKo1MXSqRDOzjiPcYnFooOUGCOsRk.woff',
  'https://fonts.gstatic.com/s/baloobhaina/v1/HxxbxOVf9WQem_hKo1MXShampu5_7CjHW5spxoeN3Vs.woff2',
  'https://fonts.gstatic.com/s/roboto/v15/oMMgfZMQthOryQo9n22dcuvvDin1pK8aKteLpeZ5c0A.woff2',
  'https://fonts.gstatic.com/s/roboto/v15/RxZJdnzeo3R5zSexge8UUZBw1xU1rKptJj_0jans920.woff2'
]

// Respond with cached resources
// This is called everytime the browser requests resources from the server
self.addEventListener('fetch', function (e) {
  console.log('fetch request : ' + e.request.url)
  e.respondWith(
    caches.match(e.request).then(function (request) {
      if (request) {
        // if cache is available, respond with cache
        console.log('responding with cache : ' + e.request.url)
        return request
      } else {
        // if there are no cache, try fetching request
        console.log('file is not cached, fetching : ' + e.request.url)
        return fetch(e.request)
      }
    })
  )
})

// Cache resources
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.log('installing cache : ' + CACHE_NAME)
      // cache everything listed on URLS list 
      return cache.addAll(URLS)
    })
  )
})

// Delete outdated caches
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keyList) {
      return Promise.all(keyList.map(function (key, i) {
        if (keyList[i] !== CACHE_NAME) {
          console.log('deleting cache : ' + keyList[i] )
          return caches.delete(keyList[i])
        }
      }))
    })
  )
});