(function () {
  'use strict';
  const siteId = document.documentElement.dataset.hannunSite;
  const slot = document.getElementById('siteAccountSlot');
  const fallback = document.querySelector('[data-account-fallback]');
  const nativeAds = /(?:^|\s)AdMobNative\/1(?:\s|$)/.test(navigator.userAgent);
  document.documentElement.dataset.hannunNativeAds = String(nativeAds);
  // No web AdFit placement is approved for these services.
  window.HannunWebPolicy = Object.freeze({ nativeAds: nativeAds, webAdFitEnabled: false });
  if (location.hostname === 'appassets.androidplatform.net' || nativeAds) {
    const note = document.querySelector('.hannun-account-note');
    if (note) note.textContent = '이 앱의 기록은 기기에만 보관돼요';
  }
  if (!slot || !['hannunae', 'geuriumpoetry'].includes(siteId)) return;
  // The shared account currently trusts this production origin only.
  // Bundled Android, file URLs and local previews keep the external account link.
  if (location.protocol !== 'https:' || location.hostname !== 'softm.github.io' || nativeAds) return;
  window.addEventListener('softm:account-ready', function (event) {
    if (event.detail && event.detail.siteId === siteId && fallback) fallback.hidden = true;
  });
  const script = document.createElement('script');
  script.type = 'module';
  script.src = 'https://softm.github.io/shared/platform/v1/cloudflare-site-boot.mjs?site=' + siteId + '&v=20261121';
  script.addEventListener('error', function () {
    if (fallback) fallback.hidden = false;
  });
  document.head.appendChild(script);
})();
