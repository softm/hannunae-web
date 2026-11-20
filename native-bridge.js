(function (global) {
  'use strict';
  function available() {
    return location.protocol === 'https:' && location.hostname === 'appassets.androidplatform.net' &&
      !!global.HannunNative && typeof global.HannunNative.postMessage === 'function';
  }
  function post(message) {
    if (!available()) return false;
    try {
      global.HannunNative.postMessage(JSON.stringify(message));
      return true;
    } catch (_) { return false; }
  }
  // The Android side restricts this object to the trusted app-assets origin and main frame.
  if (available()) {
    global.HannunNative.onmessage = function (event) {
      try {
        const result = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!result || typeof result !== 'object') return;
        global.dispatchEvent(new CustomEvent('hannun-native-result', { detail: result }));
      } catch (_) { /* Ignore malformed host messages. */ }
    };
  }
  global.HannunNativeWeb = Object.freeze({ available: available, post: post });
})(window);
