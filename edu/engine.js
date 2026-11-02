(function () {
  let controllerPromise = null;
  let controllerKey = null;
  let lastPortRefreshAt = 0;
  const PORT_REFRESH_INTERVAL_MS = 3000;

  const base = new URL("./", document.currentScript.src);

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(el);
    });
  }

  async function makeTransport(name, wisp) {
    if (name === "epoxy") {
      const { default: EpoxyClient } = await import(new URL("transport-epoxy.js", base).href);
      return new EpoxyClient({ wisp });
    }
    const { default: LibcurlClient } = await import(
      new URL("transport-libcurl.js", base).href
    );
    return new LibcurlClient({ wisp });
  }

  async function bootController(transportName, serviceWorker, wispUrl) {
    if (typeof self.$scramjet === "undefined")
      await loadScript(new URL("scramjet.core.js", base).href);
    if (typeof self.$scramjetController === "undefined")
      await loadScript(new URL("controller.api.js", base).href);

    const { Controller, config } = self.$scramjetController;
    config.prefix = new URL("pth/", base).pathname;
    config.scramjetPath = new URL("scramjet.core.js", base).href;
    config.wasmPath = new URL("scramjet.core.wasm", base).href;
    config.injectPath = new URL("controller.inject.js", base).href;

    const transport = await makeTransport(transportName, wispUrl);
    const controller = new Controller({
      serviceworker: serviceWorker,
      transport,
      scramjetConfig: self.$scramjet.defaultConfig,
    });
    await controller.wait();
    lastPortRefreshAt = Date.now();
    return controller;
  }

  function ensureController(transportName, serviceWorker, wispUrl) {
    const key = `${transportName}|${wispUrl}`;
    if (!controllerPromise) {
      controllerKey = key;
      controllerPromise = bootController(
        transportName,
        serviceWorker,
        wispUrl,
      ).catch((err) => {
        controllerPromise = null;
        controllerKey = null;
        throw err;
      });
      return controllerPromise;
    }

    if (controllerKey !== key) {
      controllerPromise = controllerPromise.then(async (controller) => {
        controller.setTransport(await makeTransport(transportName, wispUrl));
        return controller;
      });
    }

    if (Date.now() - lastPortRefreshAt > PORT_REFRESH_INTERVAL_MS) {
      lastPortRefreshAt = Date.now();
      controllerPromise = controllerPromise.then(async (controller) => {
        controller.setupMessagePort();
        await new Promise((resolve) => setTimeout(resolve, 150));
        return controller;
      });
    }
    return controllerPromise;
  }

  window.proxyEngine = { ensureController };
})();
