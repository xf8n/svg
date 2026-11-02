const BYPASSED_URLS = ["https://abscloud.org/1/535df2ab270839caff625fcd77cb8a76"];

importScripts("edu/controller.sw.js");

self.addEventListener("install", (event) => self.skipWaiting());

self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (BYPASSED_URLS.some((entry) => event.request.url.startsWith(entry))) return;
  if ($scramjetController.shouldRoute(event)) {
    event.respondWith($scramjetController.route(event));
  }
});
