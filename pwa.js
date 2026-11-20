(function () {
  'use strict';
  if (location.hostname === 'appassets.androidplatform.net') return;
  if (!('serviceWorker' in navigator) || !window.isSecureContext || !/^https?:$/.test(location.protocol)) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function () {
      // The app remains usable when offline installation is unavailable.
    });
  });
})();
