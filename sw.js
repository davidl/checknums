'use strict';

// Version of the offline cache (change this value everytime you want to update cache)
var CACHE_NAME = 'version_003430'

// Add a path you want to cache in this list.
var URLS = [                
  '/',
  '/style.css',
  '/main.js',
  'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.5/angular.min.js',
  'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.5/angular-animate.min.js',
  'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.5/angular-aria.min.js',
  'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.5/angular-messages.min.js',
  'https://ajax.googleapis.com/ajax/libs/angular_material/1.1.1/angular-material.min.js',
  'https://ajax.googleapis.com/ajax/libs/angular_material/1.1.1/angular-material.min.css',
  'https://fonts.googleapis.com/css?family=Baloo+Bhaina&text=.:!$0123456789AaBbCcDdefghIiJKklMmNnOoPpqRrSsTtuWwYy%26%27',
  'https://fonts.gstatic.com/l/font?kit=HxxbxOVf9WQem_hKo1MXSi_LaHBHVnqSwUtMLDUbADrAAa4ekE3XHkAakO4z8j5LDMRl-giHKfqe6kSCJFWSCieamgWV5dywxK_FNJqOYss&skey=3699402d0d6ef054&v=v1',
  'https://fonts.googleapis.com/css?family=Roboto:400,500',
  'https://fonts.gstatic.com/s/roboto/v16/CrYjSnGjrRCn0pd9VQsnFOvvDin1pK8aKteLpeZ5c0A.woff',
  'https://fonts.gstatic.com/s/roboto/v16/RxZJdnzeo3R5zSexge8UUbO3LdcAZYWl9Si6vvxL-qU.woff'
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