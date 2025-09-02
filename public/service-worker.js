// This is your Service Worker file.
    // You'll add caching and other PWA functionality here later.

    // For now, it's just a basic file to allow registration.
    console.log('Service Worker file loaded.');

    self.addEventListener('install', (event) => {
      console.log('Service Worker installing...');
      // You can add caching logic here
    });

    self.addEventListener('activate', (event) => {
      console.log('Service Worker activating...');
      // You can add cleanup logic here
    });

    self.addEventListener('fetch', (event) => {
      // This event is fired when a network request is made.
      // You can intercept requests and serve cached responses here.
      // console.log('Fetching:', event.request.url);
      // event.respondWith(fetch(event.request)); // Example: just fetch from the network
    });
