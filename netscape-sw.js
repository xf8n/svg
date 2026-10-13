importScripts("/vendor/s.js");

addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

addEventListener("message", (event) => {
  if (event.data?.$sw$claim) self.clients.claim();
});

addEventListener("fetch", (event) => {
  if ($netscapeController.shouldRoute(event)) {
    event.respondWith($netscapeController.route(event));
  }
});
